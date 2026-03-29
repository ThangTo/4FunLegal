import { useEffect, useState } from 'react';

import { AssistantChatShell } from '../components/AssistantChatShell';
import { SiteLayout } from '../components/SiteLayout';
import { api, AssistantSessionResponse } from '../lib/api';
import { useResolvedSubmissionId, useSubmissionQuery } from '../lib/useSubmissionQuery';

export const AssistantPage = () => {
  const { submissionId, isResolving } = useResolvedSubmissionId('/assistant');
  const { navigateWithSubmission } = useSubmissionQuery();
  const [session, setSession] = useState<AssistantSessionResponse | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await api.getAssistantSession(submissionId);

        if (!cancelled) {
          setSession(response);
          setErrorMessage('');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải trợ lý hồ sơ AI.',
          );
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const navigateByAction = (action: { route?: string; step?: number }) => {
    if (!submissionId || !action.route) {
      return;
    }

    if (action.route === '/register' && action.step) {
      navigateWithSubmission(`/register?step=${action.step}`, submissionId);
      return;
    }

    navigateWithSubmission(action.route, submissionId);
  };

  const submitQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();

    if (!question || isReplying || !submissionId || !session) {
      return;
    }

    setInputValue('');
    setIsReplying(true);

    const optimisticMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      paragraphs: [question],
    };

    setSession((current) =>
      current
        ? {
            ...current,
            messages: [...current.messages, optimisticMessage],
          }
        : current,
    );

    try {
      const response = await api.createAssistantMessage(submissionId, question);

      setSession((current) =>
        current
          ? {
              ...current,
              messages: response.messages,
              suggestedPrompts: response.suggestedPrompts,
              context: response.context,
            }
          : current,
      );
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi câu hỏi.');
    } finally {
      setIsReplying(false);
    }
  };

  if (isResolving || !session) {
    return (
      <SiteLayout showAssistant={false}>
        <main className="page-shell pt-24 md:pt-28">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              {errorMessage || 'Đang tải trợ lý hồ sơ AI...'}
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout showAssistant={false}>
      <AssistantChatShell
        title="Trợ lý hồ sơ AI"
        onlineLabel="Đang trực tuyến"
        inputPlaceholder="Đặt câu hỏi về hồ sơ của bạn..."
        inputValue={inputValue}
        messages={session.messages}
        suggestedPrompts={session.suggestedPrompts}
        isReplying={isReplying}
        errorMessage={errorMessage}
        onInputChange={setInputValue}
        onSubmit={() => void submitQuestion(inputValue)}
        onPromptClick={(prompt) => void submitQuestion(prompt)}
        onActionClick={(action) => navigateByAction(action)}
        sidebar={
          <>
            <div className="rounded-feature border border-border-base/40 bg-surface-card p-6 shadow-sm">
              <h2 className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-brand-primary/60">
                Thông tin ngữ cảnh
              </h2>

              <div className="mb-8">
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                  Hồ sơ đang chọn
                </label>
                <div className="flex items-center gap-4 rounded-xl bg-surface-subtle p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-card shadow-sm">
                    <span
                      className="material-symbols-outlined text-brand-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      storefront
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold leading-tight text-brand-deep">
                      {session.context.submission.businessName}
                    </h3>
                    <p className="text-xs text-text-muted">
                      ID: {session.context.submission.submissionCode}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                  Tóm tắt lỗi
                </label>
                <div className="rounded-xl border border-state-error/10 bg-state-error/10 p-4">
                  <div className="mb-2 flex items-center gap-2 font-bold text-state-error">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      report
                    </span>
                    {session.context.errorSummary.count} lỗi cần sửa
                  </div>
                  <ul className="space-y-2 text-xs text-text-muted">
                    {session.context.errorSummary.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-state-error" />
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {session.context.documentIssues.length > 0 ? (
                <div className="mb-8">
                  <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                    Tài liệu cần lưu ý
                  </label>
                  <div className="space-y-3">
                    {session.context.documentIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="rounded-xl border border-state-warning/15 bg-state-warning/10 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-brand-deep">{issue.title}</p>
                            <p className="mt-1 text-xs text-text-muted">
                              {issue.semanticStatusLabel}
                            </p>
                          </div>
                          <span className="rounded-full bg-surface-card px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-primary">
                            {issue.extractionConfidence || 'n/a'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mb-8">
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                  Tài liệu liên quan ({session.context.relatedDocuments.length})
                </label>
                <div className="space-y-3">
                  {session.context.relatedDocuments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-surface-card-alt bg-surface-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`material-symbols-outlined ${file.type === 'image' ? 'text-red-500' : 'text-blue-500'}`}
                        >
                          {file.type === 'image' ? 'picture_as_pdf' : 'description'}
                        </span>
                        <div>
                          <span className="block text-sm font-medium text-text-base">
                            {file.name}
                          </span>
                          {file.semanticStatusLabel ? (
                            <span className="text-xs text-text-muted">
                              {file.semanticStatusLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                  Nguồn tham chiếu pháp lý
                </label>
                <div className="space-y-2">
                  {session.context.references.map((reference) => (
                    <button
                      key={reference}
                      type="button"
                      className="flex items-center gap-3 rounded-lg p-2 text-left transition hover:bg-surface-subtle"
                    >
                      <span className="material-symbols-outlined text-brand-secondary">
                        gavel
                      </span>
                      <span className="text-xs font-medium text-text-muted underline">
                        {reference}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pr-4">
              <button
                type="button"
                className="group flex h-14 w-14 items-center justify-center rounded-full border border-brand-primary/5 bg-surface-card/80 shadow-float backdrop-blur-xl"
                aria-label="Trợ lý giọng nói"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-brand-primary to-brand-deep shadow-card transition group-hover:scale-110">
                  <span className="material-symbols-outlined text-text-inverse">
                    graphic_eq
                  </span>
                </div>
              </button>
            </div>
          </>
        }
      />
    </SiteLayout>
  );
};
