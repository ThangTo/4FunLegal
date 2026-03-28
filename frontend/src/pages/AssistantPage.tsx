import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { SiteLayout } from '../components/SiteLayout';
import { api, AssistantSessionResponse } from '../lib/api';
import { useResolvedSubmissionId, useSubmissionQuery } from '../lib/useSubmissionQuery';

export const AssistantPage = () => {
  const threadRef = useRef<HTMLDivElement | null>(null);
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
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải trợ lý AI.');
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isReplying, session?.messages]);

  const navigateByAction = (action: NonNullable<AssistantSessionResponse['messages'][number]['actions']>[number]) => {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion(inputValue);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion(inputValue);
    }
  };

  if (isResolving || !session) {
    return (
      <SiteLayout showAssistant={false}>
        <main className="page-shell pt-24 md:pt-28">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              Đang tải trợ lý AI...
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout showAssistant={false}>
      <main className="page-shell pt-24 md:pt-28">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <section className="flex h-[calc(100vh-160px)] min-h-[720px] w-full flex-col overflow-hidden rounded-feature bg-surface-card shadow-card lg:w-[70%]">
              <div className="flex items-center justify-between bg-brand-primary p-6 text-text-inverse">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-brand-deep">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      smart_toy
                    </span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">Trợ lý AI pháp lý</h1>
                    <div className="mt-1 flex items-center gap-2 text-sm text-text-inverse/80">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-secondary" />
                      Đang trực tuyến
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-lg p-2 text-text-inverse/60 transition hover:bg-white/10 hover:text-text-inverse"
                  aria-label="Tùy chọn hội thoại"
                >
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div ref={threadRef} className="flex-1 overflow-y-auto bg-surface-base p-6">
                <div className="space-y-8">
                  {session.messages.map((message) =>
                    message.role === 'assistant' ? (
                      <div key={message.id} className="flex max-w-[90%] items-start gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary">
                          <span className="material-symbols-outlined text-sm text-text-inverse">smart_toy</span>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl rounded-tl-none border border-border-base/40 bg-surface-card p-5 shadow-sm">
                            {message.paragraphs.map((paragraph) => (
                              <p key={paragraph} className="leading-relaxed text-text-base [&:not(:first-child)]:mt-4">
                                {paragraph}
                              </p>
                            ))}

                            {message.actions?.length ? (
                              <div className="mt-6 flex flex-wrap gap-3">
                                {message.actions.map((action) => (
                                  <button
                                    key={`${message.id}-${action.label}`}
                                    type="button"
                                    onClick={() => navigateByAction(action)}
                                    className={action.tone === 'primary' ? 'btn-primary px-4 py-2.5' : 'btn-outline px-4 py-2.5'}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {message.references?.length ? (
                            <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted/80">
                              <span>Nguồn tham chiếu:</span>
                              {message.references.map((reference) => (
                                <span key={reference} className="inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">description</span>
                                  {reference}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div key={message.id} className="ml-auto flex max-w-[90%] flex-row-reverse items-start gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-secondary">
                          <span className="material-symbols-outlined text-sm text-text-inverse">person</span>
                        </div>

                        <div className="rounded-2xl rounded-tr-none bg-brand-primary text-text-inverse shadow-card">
                          <p className="p-5 leading-relaxed">{message.paragraphs[0]}</p>
                        </div>
                      </div>
                    ),
                  )}

                  {isReplying ? (
                    <div className="flex max-w-[90%] items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary">
                        <span className="material-symbols-outlined text-sm text-text-inverse">smart_toy</span>
                      </div>
                      <div className="rounded-2xl rounded-tl-none border border-border-base/40 bg-surface-card p-5 shadow-sm">
                        <p className="text-text-muted">AI đang soạn phản hồi...</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-border-base/70 bg-surface-card p-6">
                {errorMessage ? (
                  <div className="mb-4 rounded-xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="mb-4 flex flex-wrap gap-2">
                  {session.suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submitQuestion(prompt)}
                      className="rounded-full border border-brand-primary/10 bg-surface-subtle px-4 py-2 text-sm text-brand-primary transition hover:bg-surface-card-alt"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex items-end gap-3 rounded-xl border-2 border-surface-card-alt bg-surface-card p-3 transition focus-within:border-brand-primary/40"
                >
                  <button type="button" className="rounded-lg p-2 text-text-muted transition hover:text-brand-primary" aria-label="Đính kèm tệp">
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>

                  <textarea
                    rows={1}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Đặt câu hỏi về pháp lý hoặc hồ sơ của bạn..."
                    className="min-h-[44px] w-full resize-none border-none bg-transparent py-2 text-text-base outline-none placeholder:text-text-muted/60 focus:ring-0"
                  />

                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded-lg p-2 text-text-muted transition hover:text-brand-primary" aria-label="Nhập bằng giọng nói">
                      <span className="material-symbols-outlined">mic</span>
                    </button>
                    <button
                      type="submit"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-text-inverse transition hover:scale-105 disabled:opacity-50"
                      disabled={!inputValue.trim() || isReplying}
                      aria-label="Gửi câu hỏi"
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        send
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <aside className="w-full space-y-6 lg:sticky lg:top-24 lg:w-[30%]">
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
                      <span className="material-symbols-outlined text-brand-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
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
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
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

                <div className="mb-8">
                  <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                    Tài liệu liên quan ({session.context.relatedDocuments.length})
                  </label>
                  <div className="space-y-3">
                    {session.context.relatedDocuments.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border border-surface-card-alt bg-surface-card p-3 transition hover:border-brand-primary/25"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined ${file.type === 'image' ? 'text-red-500' : 'text-blue-500'}`}>
                            {file.type === 'image' ? 'picture_as_pdf' : 'description'}
                          </span>
                          <span className="text-sm font-medium text-text-base">{file.name}</span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-text-muted">download</span>
                      </button>
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
                        <span className="material-symbols-outlined text-brand-secondary">gavel</span>
                        <span className="text-xs font-medium text-text-muted underline">{reference}</span>
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
                    <span className="material-symbols-outlined text-text-inverse">graphic_eq</span>
                  </div>
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};
