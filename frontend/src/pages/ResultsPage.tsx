import { cn } from "../lib/cn";
import {
  missingProcedureDocuments,
  reviewFindings,
  reviewNextActions,
  reviewScore,
  reviewSummaryItems,
  uploadedProcedureFiles,
} from "../features/procedure/mockReview";
import {
  ProcedureDraft,
  RegistrationStep,
} from "../features/procedure/procedureDraft";
import { ProcedureStepper } from "../components/ProcedureStepper";
import { SiteLayout } from "../components/SiteLayout";
import { StatusBadge } from "../components/StatusBadge";

type ResultsPageProps = {
  draft: ProcedureDraft;
  onNavigate: (path: string) => void;
  onStepChange: (step: RegistrationStep) => void;
};

const scoreCircumference = 2 * Math.PI * 40;
const scoreDashOffset = scoreCircumference * (1 - reviewScore / 100);

export const ResultsPage = ({
  draft,
  onNavigate,
  onStepChange,
}: ResultsPageProps) => {
  const navigateToRegisterStep = (step: RegistrationStep) => {
    onStepChange(step);
    onNavigate("/register");
  };

  const navigateFromTarget = (
    target: { route: "/register"; step: RegistrationStep } | { route: "/documents" },
  ) => {
    if (target.route === "/register") {
      navigateToRegisterStep(target.step);
      return;
    }

    onNavigate("/documents");
  };

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
              Kết quả kiểm tra hồ sơ
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              AI đã hoàn tất phân tích hồ sơ của bạn. Dưới đây là các điểm cần
              xử lý để tăng khả năng được tiếp nhận và hạn chế việc phải làm lại
              hồ sơ.
            </p>
          </header>

          <ProcedureStepper currentStep={6} />

          <section className="mb-12">
            <div className="card-soft rounded-feature p-8 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <StatusBadge tone="warning">Cần sửa trước khi nộp</StatusBadge>
                  <h2 className="mt-4 text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
                    Hồ sơ cần chỉnh lại một vài điểm
                  </h2>
                  <p className="mt-3 max-w-2xl text-lg leading-relaxed text-text-muted">
                    Hồ sơ hiện đã có nền tảng thông tin tốt, nhưng vẫn còn một
                    số điểm không nhất quán và tài liệu thiếu cần bổ sung trước
                    khi nộp chính thức.
                  </p>
                </div>

                <div className="card-base min-w-[240px] rounded-panel p-6 text-center shadow-panel">
                  <div className="relative mx-auto mb-3 h-24 w-24">
                    <svg className="h-full w-full -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-surface-hero"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={scoreCircumference}
                        strokeDashoffset={scoreDashOffset}
                        className="text-brand-secondary"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-brand-deep">
                        {reviewScore}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-brand-secondary">
                    Khả năng cao sẽ được duyệt sau khi sửa
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-12 lg:col-span-8">
              <section>
                <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-brand-deep">
                  <span className="material-symbols-outlined text-brand-secondary">
                    analytics
                  </span>
                  Tóm tắt đánh giá
                </h3>
                <div className="card-soft rounded-panel p-6">
                  <div className="space-y-4">
                    {reviewSummaryItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-4">
                        <span
                          className={cn(
                            "material-symbols-outlined mt-1",
                            item.tone === "success" && "text-brand-secondary",
                            item.tone === "warning" && "text-state-warning",
                            item.tone === "error" && "text-state-error",
                            item.tone === "info" && "text-brand-primary",
                          )}
                          style={
                            item.tone === "success"
                              ? { fontVariationSettings: "'FILL' 1" }
                              : undefined
                          }
                        >
                          {item.icon}
                        </span>
                        <p className="leading-relaxed text-text-base">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-brand-deep">
                  <span className="material-symbols-outlined text-brand-secondary">
                    assignment_late
                  </span>
                  Các lỗi cần xử lý
                </h3>

                <div className="space-y-6">
                  {reviewFindings.map((finding) => {
                    const extractedValue = finding.sourceField
                      ? draft[finding.sourceField]
                      : finding.extractedValueFallback;

                    return (
                      <article
                        key={finding.id}
                        className={cn(
                          "card-base rounded-panel border-l-4 p-6 shadow-panel",
                          finding.severity === "critical"
                            ? "border-l-state-error"
                            : "border-l-state-warning",
                        )}
                      >
                        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <StatusBadge
                              tone={
                                finding.severity === "critical"
                                  ? "error"
                                  : "warning"
                              }
                            >
                              {finding.severity === "critical"
                                ? "Nghiêm trọng"
                                : "Trung bình"}
                            </StatusBadge>
                            <h4 className="mt-3 text-xl font-bold text-brand-deep">
                              {finding.title}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigateFromTarget(finding.target)}
                            className="btn-primary px-4 py-2"
                          >
                            Sửa ngay
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                              Trường bị ảnh hưởng
                            </p>
                            <p className="font-semibold text-text-base">
                              {finding.affectedField}
                            </p>
                          </div>

                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                              Thông tin AI đọc được
                            </p>
                            <p className="font-semibold text-text-base">
                              “{extractedValue || finding.extractedValueFallback}”
                            </p>
                          </div>

                          <div className="md:col-span-2">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                              Lý do có thể bị trả hồ sơ
                            </p>
                            <p className="leading-relaxed text-text-base">
                              {finding.rejectionReason}
                            </p>
                          </div>

                          <div className="md:col-span-2 rounded-xl bg-surface-subtle p-4">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                              Cách sửa đề xuất
                            </p>
                            <p className="font-medium italic text-brand-secondary">
                              {finding.suggestion}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-brand-deep">
                  <span className="material-symbols-outlined text-brand-secondary">
                    folder_open
                  </span>
                  Tài liệu còn thiếu
                </h3>

                <div className="card-soft rounded-panel p-6">
                  <div className="space-y-3">
                    {missingProcedureDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col gap-4 rounded-xl border border-border-base/30 bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <span className="material-symbols-outlined text-3xl text-state-error">
                            description
                          </span>
                          <div>
                            <p className="font-bold text-brand-deep">
                              {document.label}
                            </p>
                            <p className="text-sm text-text-muted">
                              {document.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigateFromTarget(document.target)}
                          className="btn-ghost px-0 py-0 text-brand-secondary"
                        >
                          <span className="material-symbols-outlined">
                            upload_file
                          </span>
                          Tải lên
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="pb-20">
                <h3 className="mb-8 flex items-center gap-2 text-2xl font-bold text-brand-deep">
                  <span className="material-symbols-outlined text-brand-secondary">
                    auto_mode
                  </span>
                  Gợi ý bước tiếp theo
                </h3>

                <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
                  {reviewNextActions.map((action, index) => (
                    <div key={action.id} className="flex flex-1 items-stretch gap-4">
                      <div
                        className={cn(
                          "flex-1 rounded-feature p-6",
                          index === 0
                            ? "bg-brand-primary text-text-inverse"
                            : "bg-surface-card-alt text-text-base",
                        )}
                      >
                        <div
                          className={cn(
                            "mb-4 flex h-10 w-10 items-center justify-center rounded-full font-bold",
                            index === 0
                              ? "bg-text-inverse text-brand-primary"
                              : "bg-brand-primary text-text-inverse",
                          )}
                        >
                          {action.step}
                        </div>
                        <h4 className="text-lg font-bold">{action.title}</h4>
                        <p
                          className={cn(
                            "mt-2 text-sm leading-relaxed",
                            index === 0
                              ? "text-text-inverse/80"
                              : "text-text-muted",
                          )}
                        >
                          {action.description}
                        </p>
                      </div>

                      {index < reviewNextActions.length - 1 ? (
                        <div className="hidden items-center justify-center text-text-muted md:flex">
                          <span className="material-symbols-outlined">
                            arrow_forward
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="lg:col-span-4">
              <div className="space-y-6 lg:sticky lg:top-28">
                <div className="overflow-hidden rounded-feature border border-border-base/70 bg-surface-card shadow-panel">
                  <div className="bg-brand-primary px-6 py-4">
                    <h3 className="flex items-center gap-2 font-bold text-text-inverse">
                      <span className="material-symbols-outlined text-brand-secondary">
                        assignment_ind
                      </span>
                      Tóm tắt hồ sơ
                    </h3>
                  </div>

                  <div className="space-y-4 p-6">
                    <ResultMeta
                      label="Chủ hộ kinh doanh"
                      value={draft.ownerName}
                    />
                    <ResultMeta
                      label="Mã số hồ sơ"
                      value="HKD-2026-88912"
                      mono
                    />
                    <ResultMeta
                      label="Tên kinh doanh"
                      value={draft.businessName}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-feature border border-border-base/70 bg-surface-card shadow-panel">
                  <div className="border-b border-border-base/60 px-6 py-4">
                    <h3 className="flex items-center gap-2 font-bold text-brand-deep">
                      <span className="material-symbols-outlined text-brand-secondary">
                        attachment
                      </span>
                      Tệp đã tải lên
                    </h3>
                  </div>

                  <div className="space-y-2 p-4">
                    {uploadedProcedureFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-xl bg-surface-subtle p-3 transition hover:bg-surface-hero"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="material-symbols-outlined text-brand-primary">
                            {file.type === "image" ? "image" : "picture_as_pdf"}
                          </span>
                          <span className="truncate text-sm font-medium">
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-xs font-bold text-brand-secondary"
                        >
                          Xem
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => navigateToRegisterStep(2)}
                    className="btn-outline h-14 justify-center"
                  >
                    <span className="material-symbols-outlined">edit_note</span>
                    Sửa thông tin
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("/documents")}
                    className="btn-outline h-14 justify-center"
                  >
                    <span className="material-symbols-outlined">cloud_upload</span>
                    Tải lại tài liệu
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("/assistant")}
                    className="btn-secondary h-14 justify-center"
                  >
                    <span className="material-symbols-outlined">smart_toy</span>
                    Hỏi AI trợ giúp
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-primary h-14 justify-center"
                  >
                    <span className="material-symbols-outlined">
                      picture_as_pdf
                    </span>
                    Xuất báo cáo PDF
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};

type ResultMetaProps = {
  label: string;
  value: string;
  mono?: boolean;
};

const ResultMeta = ({ label, value, mono = false }: ResultMetaProps) => {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
      <p className={cn("text-lg font-semibold text-text-base", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
};
