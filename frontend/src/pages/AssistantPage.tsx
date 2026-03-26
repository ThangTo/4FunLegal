import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import {
  missingProcedureDocuments,
  reviewFindings,
  uploadedProcedureFiles,
} from "../features/procedure/mockReview";
import {
  ProcedureDraft,
  RegistrationStep,
} from "../features/procedure/procedureDraft";
import { SiteLayout } from "../components/SiteLayout";

type AssistantPageProps = {
  draft: ProcedureDraft;
  onNavigate: (path: string) => void;
  onStepChange: (step: RegistrationStep) => void;
};

type AssistantAction =
  | {
      label: string;
      icon: string;
      tone: "primary" | "outline";
      route: "/register";
      step: RegistrationStep;
    }
  | {
      label: string;
      icon: string;
      tone: "primary" | "outline";
      route: "/documents" | "/results";
    };

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  paragraphs: string[];
  references?: string[];
  actions?: AssistantAction[];
};

const suggestedPrompts = [
  "Hồ sơ của tôi còn thiếu gì?",
  "Tên hộ kinh doanh này có phù hợp không?",
  "Tôi cần sửa mục nào trước?",
];

const initialMessages = (
  draft: ProcedureDraft,
): ChatMessage[] => [
  {
    id: "assistant-welcome",
    role: "assistant",
    paragraphs: [
      `Chào bạn, tôi đã kiểm tra hồ sơ đăng ký "${draft.businessName}" của bạn. Qua đối soát với quy định hiện hành, tôi phát hiện một vài điểm cần lưu ý về tên gọi, mô tả hoạt động và tài liệu bổ sung.`,
      "Bạn có muốn tôi hướng dẫn chi tiết cách sửa đổi các mục này không?",
    ],
    references: ["Nghị định 01/2021/NĐ-CP", "Luật Doanh nghiệp 2020"],
    actions: [
      {
        label: "Áp dụng đề xuất",
        icon: "check_circle",
        tone: "primary",
        route: "/register",
        step: 2,
      },
      {
        label: "Mở mục cần sửa",
        icon: "edit_note",
        tone: "outline",
        route: "/results",
      },
    ],
  },
];

const buildAssistantReply = (
  question: string,
  draft: ProcedureDraft,
): ChatMessage => {
  const normalized = question.toLowerCase();

  if (normalized.includes("thiếu")) {
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      paragraphs: [
        `Hiện tại hồ sơ của bạn còn thiếu ${missingProcedureDocuments[0].label.toLowerCase()}. Ngoài ra, AI cũng đang gắn cờ ${reviewFindings.length} điểm cần sửa trong phần kê khai.`,
        "Nếu người nộp hồ sơ không phải là chủ hộ thì bạn nên tải bổ sung giấy ủy quyền trước, sau đó quay lại chỉnh tên hộ kinh doanh và mô tả hoạt động.",
      ],
      references: ["Nghị định 01/2021/NĐ-CP"],
      actions: [
        {
          label: "Tải bổ sung tài liệu",
          icon: "upload_file",
          tone: "primary",
          route: "/documents",
        },
        {
          label: "Xem kết quả kiểm tra",
          icon: "assignment",
          tone: "outline",
          route: "/results",
        },
      ],
    };
  }

  if (normalized.includes("tên")) {
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      paragraphs: [
        `Tên hiện tại "${draft.businessName}" chưa sai hoàn toàn, nhưng khá phổ biến và dễ bị yêu cầu bổ sung yếu tố phân biệt tại địa phương đăng ký.`,
        'Bạn nên giữ thành tố "Hộ kinh doanh" ở đầu tên và thêm yếu tố nhận diện rõ hơn như khu vực, nhóm sản phẩm hoặc tên riêng của hộ.',
      ],
      references: ["Nghị định 01/2021/NĐ-CP"],
      actions: [
        {
          label: "Sửa tên hộ kinh doanh",
          icon: "edit_note",
          tone: "primary",
          route: "/register",
          step: 2,
        },
      ],
    };
  }

  if (normalized.includes("sửa") || normalized.includes("trước")) {
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      paragraphs: [
        "Bạn nên xử lý theo thứ tự sau để giảm rủi ro bị trả hồ sơ: 1) chỉnh lại tên hộ kinh doanh, 2) làm rõ mô tả hoạt động, 3) bổ sung giấy ủy quyền nếu có người nộp thay.",
        "Nếu bạn muốn, tôi có thể đưa bạn thẳng đến bước thông tin hộ kinh doanh để sửa ngay từ form khai báo.",
      ],
      references: ["Luật Doanh nghiệp 2020"],
      actions: [
        {
          label: "Đi tới bước cần sửa",
          icon: "arrow_forward",
          tone: "primary",
          route: "/register",
          step: 2,
        },
      ],
    };
  }

  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    paragraphs: [
      `Tôi đã ghi nhận câu hỏi của bạn về hồ sơ "${draft.businessName}".`,
      "Bạn có thể hỏi cụ thể về tên hộ kinh doanh, giấy ủy quyền, tài liệu còn thiếu hoặc thứ tự sửa lỗi để tôi trả lời chính xác hơn.",
    ],
    references: ["Nghị định 01/2021/NĐ-CP"],
  };
};

export const AssistantPage = ({
  draft,
  onNavigate,
  onStepChange,
}: AssistantPageProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages(draft),
  );
  const [inputValue, setInputValue] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [typingDots, setTypingDots] = useState(".");
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isReplying]);

  useEffect(() => {
    if (!isReplying) {
      return;
    }

    const interval = window.setInterval(() => {
      setTypingDots((current) => (current.length >= 3 ? "." : `${current}.`));
    }, 350);

    return () => {
      window.clearInterval(interval);
    };
  }, [isReplying]);

  useEffect(() => {
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const navigateByAction = (action: AssistantAction) => {
    if (action.route === "/register") {
      onStepChange(action.step);
    }

    onNavigate(action.route);
  };

  const submitQuestion = (rawQuestion: string) => {
    const question = rawQuestion.trim();

    if (!question || isReplying) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      paragraphs: [question],
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsReplying(true);
    setTypingDots(".");

    const nextTimeoutId = window.setTimeout(() => {
      setMessages((current) => [...current, buildAssistantReply(question, draft)]);
      setIsReplying(false);
    }, 900);

    setTimeoutId(nextTimeoutId);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuestion(inputValue);
  };

  const handleTextareaKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(inputValue);
    }
  };

  return (
    <SiteLayout showAssistant={false}>
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

              <div
                ref={threadRef}
                className="flex-1 overflow-y-auto bg-surface-base p-6"
              >
                <div className="space-y-8">
                  {messages.map((message) =>
                    message.role === "assistant" ? (
                      <div
                        key={message.id}
                        className="flex max-w-[90%] items-start gap-4"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary">
                          <span className="material-symbols-outlined text-sm text-text-inverse">
                            smart_toy
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl rounded-tl-none border border-border-base/40 bg-surface-card p-5 shadow-sm">
                            {message.paragraphs.map((paragraph) => (
                              <p
                                key={paragraph}
                                className="leading-relaxed text-text-base [&:not(:first-child)]:mt-4"
                              >
                                {paragraph}
                              </p>
                            ))}

                            {message.actions?.length ? (
                              <div className="mt-6 flex flex-wrap gap-3">
                                {message.actions.map((action) => (
                                  <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => navigateByAction(action)}
                                    className={
                                      action.tone === "primary"
                                        ? "btn-primary px-4 py-2.5"
                                        : "btn-outline px-4 py-2.5"
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
                                <span
                                  key={reference}
                                  className="inline-flex items-center gap-1"
                                >
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
                        <p className="text-text-muted">AI đang soạn phản hồi{typingDots}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-border-base/70 bg-surface-card p-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitQuestion(prompt)}
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
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Đặt câu hỏi về pháp lý hoặc hồ sơ của bạn..."
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
                      disabled={!inputValue.trim() || isReplying}
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
                      <span
                        className="material-symbols-outlined text-brand-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        storefront
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold leading-tight text-brand-deep">
                        {draft.businessName}
                      </h3>
                      <p className="text-xs text-text-muted">ID: HKD-2026-0892</p>
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
                      {reviewFindings.length} lỗi cần sửa
                    </div>
                    <ul className="space-y-2 text-xs text-text-muted">
                      {reviewFindings.map((finding) => (
                        <li key={finding.id} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-state-error" />
                          <span>{finding.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                    Tài liệu liên quan ({uploadedProcedureFiles.length})
                  </label>
                  <div className="space-y-3">
                    {uploadedProcedureFiles.slice(0, 2).map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border border-surface-card-alt bg-surface-card p-3 transition hover:border-brand-primary/25"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`material-symbols-outlined ${
                              file.type === "image" ? "text-red-500" : "text-blue-500"
                            }`}
                          >
                            {file.type === "image" ? "picture_as_pdf" : "description"}
                          </span>
                          <span className="text-sm font-medium text-text-base">
                            {file.name}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-text-muted">
                          download
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted/80">
                    Nguồn tham chiếu pháp lý
                  </label>
                  <div className="space-y-2">
                    {["Nghị định 01/2021/NĐ-CP", "Luật Doanh nghiệp 2020"].map(
                      (reference) => (
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
                      ),
                    )}
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
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};
