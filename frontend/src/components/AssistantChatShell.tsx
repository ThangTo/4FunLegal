import { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef } from 'react';

type AssistantChatAction = {
  label: string;
  icon: string;
  tone: 'primary' | 'outline';
  route?: string;
  step?: number;
};

export type AssistantChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  paragraphs: string[];
  references?: string[];
  actions?: AssistantChatAction[];
};

type AssistantChatShellProps = {
  title: string;
  onlineLabel: string;
  inputPlaceholder: string;
  inputValue: string;
  messages: AssistantChatMessage[];
  suggestedPrompts: string[];
  isReplying: boolean;
  isInputDisabled?: boolean;
  errorMessage: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onPromptClick: (prompt: string) => void;
  onActionClick?: (action: AssistantChatAction) => void;
  sidebar?: ReactNode;
};

export const AssistantChatShell = ({
  title,
  onlineLabel,
  inputPlaceholder,
  inputValue,
  messages,
  suggestedPrompts,
  isReplying,
  isInputDisabled = false,
  errorMessage,
  onInputChange,
  onSubmit,
  onPromptClick,
  onActionClick,
  sidebar,
}: AssistantChatShellProps) => {
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    if (typeof threadRef.current.scrollTo === 'function') {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: 'smooth',
      });
      return;
    }

    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [isReplying, messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <main className="page-shell pt-24 md:pt-28">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <section className="flex h-[calc(100vh-160px)] min-h-[720px] w-full flex-col overflow-hidden rounded-feature bg-surface-card shadow-card lg:w-[70%]">
            <div className="flex items-center justify-between bg-brand-primary p-6 text-text-inverse">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-brand-deep">
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    smart_toy
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">{title}</h1>
                  <div className="mt-1 flex items-center gap-2 text-sm text-text-inverse/80">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-secondary" />
                    {onlineLabel}
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
                {messages.map((message) =>
                  message.role === 'assistant' ? (
                    <div key={message.id} className="flex max-w-[90%] items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary">
                        <span className="material-symbols-outlined text-sm text-text-inverse">
                          smart_toy
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl rounded-tl-none border border-border-base/40 bg-surface-card p-5 shadow-sm">
                          {message.paragraphs.map((paragraph) => (
                            <p
                              key={`${message.id}-${paragraph}`}
                              className="leading-relaxed text-text-base [&:not(:first-child)]:mt-4"
                            >
                              {paragraph}
                            </p>
                          ))}

                          {message.actions?.length && onActionClick ? (
                            <div className="mt-6 flex flex-wrap gap-3">
                              {message.actions.map((action) => (
                                <button
                                  key={`${message.id}-${action.label}`}
                                  type="button"
                                  onClick={() => onActionClick(action)}
                                  className={
                                    action.tone === 'primary'
                                      ? 'btn-primary px-4 py-2.5'
                                      : 'btn-outline px-4 py-2.5'
                                  }
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {action.icon}
                                  </span>
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
                                <span className="material-symbols-outlined text-[14px]">
                                  description
                                </span>
                                {reference}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={message.id}
                      className="ml-auto flex max-w-[90%] flex-row-reverse items-start gap-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-secondary">
                        <span className="material-symbols-outlined text-sm text-text-inverse">
                          person
                        </span>
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
                      <span className="material-symbols-outlined text-sm text-text-inverse">
                        smart_toy
                      </span>
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
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onPromptClick(prompt)}
                    disabled={isInputDisabled || isReplying}
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
                <button
                  type="button"
                  className="rounded-lg p-2 text-text-muted transition hover:text-brand-primary"
                  aria-label="Đính kèm tệp"
                >
                  <span className="material-symbols-outlined">attach_file</span>
                </button>

                <textarea
                  rows={1}
                  value={inputValue}
                  onChange={(event) => onInputChange(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={inputPlaceholder}
                  disabled={isInputDisabled}
                  className="min-h-[44px] w-full resize-none border-none bg-transparent py-2 text-text-base outline-none placeholder:text-text-muted/60 focus:ring-0"
                />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-text-muted transition hover:text-brand-primary"
                    aria-label="Nhập bằng giọng nói"
                  >
                    <span className="material-symbols-outlined">mic</span>
                  </button>
                  <button
                    type="submit"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-text-inverse transition hover:scale-105 disabled:opacity-50"
                    disabled={isInputDisabled || !inputValue.trim() || isReplying}
                    aria-label="Gửi câu hỏi"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      send
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {sidebar ? <aside className="w-full space-y-6 lg:sticky lg:top-24 lg:w-[30%]">{sidebar}</aside> : null}
        </div>
      </div>
    </main>
  );
};
