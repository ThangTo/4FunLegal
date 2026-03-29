import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AssistantChatMessage, AssistantChatShell } from '../components/AssistantChatShell';
import { SiteLayout } from '../components/SiteLayout';
import {
  api,
  LegalAssistantAvailability,
  LegalAssistantMessageResponse,
  LegalAssistantSessionResponse,
  LibraryDocumentDetail,
} from '../lib/api';

const defaultAvailability: LegalAssistantAvailability = {
  available: false,
  degraded: false,
  serviceMode: 'loading',
  neo4jReady: false,
  chromaReady: false,
  geminiConfigured: false,
  reason: null,
};

const getAssistantStatusLabel = (availability: LegalAssistantAvailability) => {
  if (!availability.available) {
    return 'Tạm gián đoạn';
  }

  if (availability.degraded) {
    return 'Chế độ dự phòng';
  }

  return 'Đang trực tuyến';
};

const toHistoryPayload = (messages: AssistantChatMessage[]) =>
  messages.map((item) => ({
    role: item.role,
    paragraphs: item.paragraphs,
  }));

export const SupportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [availability, setAvailability] =
    useState<LegalAssistantAvailability>(defaultAvailability);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resolvedDocument, setResolvedDocument] = useState<LibraryDocumentDetail | null>(null);
  const inFlightRequestRef = useRef(false);

  const supportContext = useMemo(() => {
    const search = new URLSearchParams(location.search);

    return {
      documentTitle: search.get('documentTitle') || undefined,
      documentSummary: search.get('documentSummary') || undefined,
      documentSlug: search.get('documentSlug') || undefined,
    };
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      setIsLoading(true);

      try {
        const response: LegalAssistantSessionResponse = await api.getLegalAssistantSession();

        if (!cancelled) {
          setMessages(response.welcome);
          setSuggestedPrompts(response.suggestedPrompts);
          setAvailability(response.availability);
          setErrorMessage('');
        }
      } catch (error) {
        if (!cancelled) {
          setMessages([
            {
              id: 'support-load-error',
              role: 'assistant',
              paragraphs: [
                'Không thể khởi tạo trợ lý pháp lý AI lúc này.',
                'Bạn có thể thử tải lại trang sau khi gateway và FastAPI đã sẵn sàng.',
              ],
              references: [],
            },
          ]);
          setSuggestedPrompts([]);
          setAvailability({
            ...defaultAvailability,
            serviceMode: 'unreachable',
            reason: error instanceof Error ? error.message : 'Dịch vụ AI hiện không phản hồi.',
          });
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải trợ lý pháp lý AI.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadResolvedDocument = async () => {
      if (!supportContext.documentSlug) {
        setResolvedDocument(null);
        return;
      }

      try {
        const detail = await api.getLibraryDocumentDetail(supportContext.documentSlug);

        if (!cancelled) {
          setResolvedDocument(detail);
        }
      } catch {
        if (!cancelled) {
          setResolvedDocument(null);
        }
      }
    };

    void loadResolvedDocument();

    return () => {
      cancelled = true;
    };
  }, [supportContext.documentSlug]);

  const submitQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();

    if (!question || inFlightRequestRef.current || !availability.available) {
      return;
    }

    const optimisticMessage: AssistantChatMessage = {
      id: `support-user-${Date.now()}`,
      role: 'user',
      paragraphs: [question],
    };
    const nextHistory = [...messages, optimisticMessage];

    setInputValue('');
    setErrorMessage('');
    setIsReplying(true);
    inFlightRequestRef.current = true;
    setMessages(nextHistory);

    try {
      const response: LegalAssistantMessageResponse =
        await api.createLegalAssistantMessage({
          message: question,
          history: toHistoryPayload(nextHistory),
          context:
            resolvedDocument ||
            supportContext.documentTitle ||
            supportContext.documentSummary ||
            supportContext.documentSlug
              ? {
                  documentSlug: resolvedDocument?.slug || supportContext.documentSlug,
                  documentTitle: resolvedDocument?.title || supportContext.documentTitle,
                  documentSummary: resolvedDocument?.summary || supportContext.documentSummary,
                  sourceName: resolvedDocument?.sourceName,
                  sourceUrl: resolvedDocument?.sourceUrl,
                  documentNumber: resolvedDocument?.documentNumber,
                  highlights: resolvedDocument?.highlights,
                  roadmap: resolvedDocument?.roadmap,
                  officialLinks: resolvedDocument?.officialLinks,
                }
              : undefined,
        });

      setMessages([...nextHistory, response.reply]);
      setSuggestedPrompts(response.suggestedPrompts);
      setAvailability(response.availability);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi câu hỏi.');
    } finally {
      inFlightRequestRef.current = false;
      setIsReplying(false);
    }
  };

  if (isLoading) {
    return (
      <SiteLayout showAssistant={false}>
        <main className="page-shell pt-24 md:pt-28">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              Đang tải trợ lý pháp lý AI...
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout showAssistant={false}>
      <AssistantChatShell
        title="Trợ lý pháp lý AI"
        onlineLabel={getAssistantStatusLabel(availability)}
        inputPlaceholder={
          availability.available
            ? 'Hỏi về quy định pháp lý, điều kiện đăng ký hoặc bộ hồ sơ cần chuẩn bị...'
            : 'Kho tri thức AI chưa sẵn sàng'
        }
        inputValue={inputValue}
        messages={messages}
        suggestedPrompts={suggestedPrompts}
        isReplying={isReplying}
        isInputDisabled={!availability.available}
        errorMessage={errorMessage}
        onInputChange={setInputValue}
        onSubmit={() => void submitQuestion(inputValue)}
        onPromptClick={(prompt) => void submitQuestion(prompt)}
        sidebar={
          <>
            <div className="rounded-feature border border-border-base/40 bg-surface-card p-6 shadow-sm">
              <h2 className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-brand-primary/60">
                Trạng thái dịch vụ
              </h2>

              <div
                className={`rounded-xl border px-4 py-4 text-sm ${
                  availability.available
                    ? availability.degraded
                      ? 'border-state-warning/20 bg-state-warning/10 text-state-warning'
                      : 'border-state-success/20 bg-state-success/10 text-state-success'
                    : 'border-state-error/20 bg-state-error/10 text-state-error'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-base">
                    {availability.available
                      ? availability.degraded
                        ? 'warning'
                        : 'verified'
                      : 'error'}
                  </span>
                  {availability.available
                    ? availability.degraded
                      ? 'Đang chạy ở chế độ dự phòng'
                      : 'Knowledge base đã sẵn sàng'
                    : 'GraphRAG chưa sẵn sàng'}
                </div>
                <p className="mt-2 leading-relaxed">
                  {availability.reason ||
                    'Bạn có thể gửi câu hỏi để hệ thống tra cứu và tổng hợp căn cứ pháp lý liên quan.'}
                </p>
              </div>

              <div className="mt-6 space-y-3 text-sm text-text-muted">
                <div className="flex items-center justify-between rounded-lg bg-surface-subtle px-4 py-3">
                  <span>Neo4j</span>
                  <span className="font-semibold text-brand-deep">
                    {availability.neo4jReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-subtle px-4 py-3">
                  <span>ChromaDB</span>
                  <span className="font-semibold text-brand-deep">
                    {availability.chromaReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-subtle px-4 py-3">
                  <span>Gemini</span>
                  <span className="font-semibold text-brand-deep">
                    {availability.geminiConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                  </span>
                </div>
              </div>
            </div>

            {(resolvedDocument || supportContext.documentTitle || supportContext.documentSummary) && (
              <div className="rounded-feature border border-border-base/40 bg-surface-card p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-primary/60">
                  Ngữ cảnh từ thư viện
                </h2>
                <div className="rounded-xl bg-surface-subtle p-4">
                  <h3 className="font-bold text-brand-deep">
                    {resolvedDocument?.title || supportContext.documentTitle || 'Tài liệu đang xem'}
                  </h3>
                  {(resolvedDocument?.summary || supportContext.documentSummary) ? (
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">
                      {resolvedDocument?.summary || supportContext.documentSummary}
                    </p>
                  ) : null}
                  {resolvedDocument?.documentNumber ? (
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-primary/60">
                      {resolvedDocument.documentNumber}
                    </p>
                  ) : null}
                  {resolvedDocument?.highlights?.length ? (
                    <ul className="mt-4 space-y-2 text-sm text-text-muted">
                      {resolvedDocument.highlights.slice(0, 3).map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-secondary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/library')}
                  className="btn-outline mt-4 w-full justify-center"
                >
                  Quay lại kho tài liệu
                </button>
              </div>
            )}

            <div className="rounded-feature border border-border-base/40 bg-surface-card p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-primary/60">
                Gợi ý câu hỏi
              </h2>
              <div className="space-y-3">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitQuestion(prompt)}
                    disabled={!availability.available}
                    className="w-full rounded-xl border border-brand-primary/10 bg-surface-subtle px-4 py-3 text-left text-sm font-medium text-brand-deep transition hover:bg-surface-card-alt disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </>
        }
      />
    </SiteLayout>
  );
};
