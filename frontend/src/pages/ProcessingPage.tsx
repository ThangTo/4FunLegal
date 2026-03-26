import { useEffect, useMemo, useState } from "react";

import { cn } from "../lib/cn";
import {
  processingTimeline,
  uploadedProcedureFiles,
} from "../features/procedure/mockReview";
import {
  ProcedureDraft,
  formatPhone,
} from "../features/procedure/procedureDraft";
import { ProcedureStepper } from "../components/ProcedureStepper";
import { SiteLayout } from "../components/SiteLayout";

type ProcessingPageProps = {
  draft: ProcedureDraft;
  onNavigate: (path: string) => void;
};

const FINAL_STAGE = processingTimeline.length;

export const ProcessingPage = ({
  draft,
  onNavigate,
}: ProcessingPageProps) => {
  const [progressStage, setProgressStage] = useState(1);

  useEffect(() => {
    setProgressStage(1);

    const interval = window.setInterval(() => {
      setProgressStage((current) => {
        if (current >= FINAL_STAGE) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 1400);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const isComplete = progressStage >= FINAL_STAGE;

  const remainingLabel = useMemo(() => {
    if (isComplete) {
      return "Đã hoàn tất phân tích";
    }

    if (progressStage >= 3) {
      return "Khoảng 1 phút";
    }

    return "Khoảng 2 phút";
  }, [isComplete, progressStage]);

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
              Trạng thái xử lý hồ sơ
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              Hệ thống đang kiểm tra tính hợp lệ của các tệp bạn vừa tải lên và
              đối chiếu với thông tin kê khai để chuẩn bị kết quả phân tích chi
              tiết.
            </p>
          </header>

          <ProcedureStepper currentStep={5} />

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
            <section className="lg:col-span-8">
              <div className="card-base rounded-feature border border-border-base/50 p-8 shadow-panel md:p-12">
                <header className="mb-12 text-center">
                  <div
                    className={cn(
                      "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full",
                      isComplete
                        ? "bg-state-success/12 text-state-success"
                        : "bg-surface-hero text-brand-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-4xl",
                        isComplete ? "" : "animate-spin [animation-duration:3s]",
                      )}
                      style={
                        isComplete
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      {isComplete ? "check_circle" : "sync"}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-brand-deep md:text-4xl">
                    {isComplete
                      ? "Phân tích hồ sơ đã hoàn tất"
                      : "Hệ thống đang kiểm tra hồ sơ của bạn"}
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-text-muted">
                    {isComplete
                      ? "AI đã tổng hợp xong các điểm cần lưu ý. Bạn có thể mở kết quả để xem lỗi chi tiết và cách sửa phù hợp."
                      : "Trí tuệ nhân tạo đang phân tích các tài liệu bạn đã tải lên để đảm bảo tính hợp lệ theo quy định hiện hành."}
                  </p>
                </header>

                <div className="mx-auto max-w-2xl">
                  {processingTimeline.map((item, index) => {
                    const isDone = index < progressStage;
                    const isActive = index === progressStage && !isComplete;
                    const isLast = index === processingTimeline.length - 1;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "relative ml-4 flex gap-6",
                          !isLast && "border-l-2 pb-8",
                          isDone ? "border-brand-secondary/30" : "border-border-base",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute -left-[1.35rem] top-0 flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-surface-card",
                            isDone
                              ? "bg-brand-secondary text-text-inverse"
                              : isActive
                                ? "border-2 border-brand-secondary bg-surface-card text-brand-secondary shadow-card"
                                : "bg-surface-hero text-text-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "material-symbols-outlined text-xl",
                              isActive && "animate-spin [animation-duration:3s]",
                            )}
                            style={
                              isDone && !isActive
                                ? { fontVariationSettings: "'FILL' 1" }
                                : undefined
                            }
                          >
                            {isDone && !isActive ? "check" : item.icon}
                          </span>
                        </div>

                        <div
                          className={cn(
                            "pl-6",
                            !isDone && !isActive && "opacity-60",
                          )}
                        >
                          <h3
                            className={cn(
                              "text-lg font-bold",
                              isActive
                                ? "text-brand-secondary"
                                : "text-brand-deep",
                            )}
                          >
                            {item.title}
                          </h3>
                          <p
                            className={cn(
                              "mt-1 text-sm",
                              isActive ? "font-medium text-brand-secondary" : "text-text-muted",
                            )}
                          >
                            {isDone
                              ? item.completedLabel
                              : isActive
                                ? "Đang xử lý dữ liệu AI..."
                                : item.pendingLabel}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-16 flex flex-col items-center gap-6 border-t border-border-base/70 pt-10">
                  <div className="flex items-center gap-3 rounded-full bg-surface-subtle px-6 py-3">
                    <span className="material-symbols-outlined text-brand-primary">
                      schedule
                    </span>
                    <span className="font-medium text-brand-deep">
                      Thời gian còn lại dự kiến:{" "}
                      <strong className="text-brand-secondary">
                        {remainingLabel}
                      </strong>
                    </span>
                  </div>

                  <p className="max-w-xl text-center italic leading-relaxed text-text-muted">
                    {isComplete
                      ? "Bạn có thể mở kết quả ngay bây giờ hoặc quay lại để bổ sung tài liệu trước khi phân tích lại."
                      : "Bạn có thể tiếp tục chờ hoặc quay lại sau. Chúng tôi sẽ thông báo khi hoàn tất."}
                  </p>

                  <div className="mt-2 flex w-full flex-col justify-center gap-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => onNavigate("/documents")}
                      className="btn-outline px-8 py-4"
                    >
                      Quay lại tài liệu
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate("/results")}
                      disabled={!isComplete}
                      className="btn-primary px-8 py-4"
                    >
                      {isComplete ? "Xem kết quả phân tích" : "Đang tổng hợp..."}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-6 lg:sticky lg:top-32 lg:col-span-4">
              <div className="card-soft rounded-feature p-6 shadow-card">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-brand-deep">
                  <span className="material-symbols-outlined text-brand-primary">
                    info
                  </span>
                  Tóm tắt hồ sơ
                </h3>

                <div className="mb-8 rounded-panel bg-surface-card p-4 shadow-card">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        person
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
                        Chủ hộ kinh doanh
                      </p>
                      <p className="text-lg font-bold text-brand-deep">
                        {draft.ownerName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <SummaryInfo label="Liên hệ" value={formatPhone(draft.phone)} />
                  <SummaryInfo label="Tên hộ kinh doanh" value={draft.businessName} />
                  <SummaryInfo
                    label="Tài liệu đã tải"
                    value={`${uploadedProcedureFiles.length} tệp`}
                  />
                </div>

                <div className="mt-8 space-y-3">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-text-muted">
                    Tệp đang xử lý
                  </p>
                  {uploadedProcedureFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl bg-surface-card p-4 transition hover:ring-2 hover:ring-brand-secondary/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-brand-secondary">
                          {file.type === "image" ? "image" : "description"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-brand-deep">
                            {file.label}
                          </p>
                          <p className="text-xs text-text-muted">
                            {file.size} • {file.format}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "material-symbols-outlined text-lg",
                          file.status === "verified"
                            ? "text-brand-secondary"
                            : "animate-pulse text-brand-primary",
                        )}
                        style={
                          file.status === "verified"
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined
                        }
                      >
                        {file.status === "verified" ? "check_circle" : "settings"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-panel bg-brand-primary p-4 text-text-inverse">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-brand-secondary">
                      lightbulb
                    </span>
                    <p className="text-sm leading-relaxed text-text-inverse/90">
                      AI sẽ ưu tiên đối chiếu các trường dễ bị trả hồ sơ như tên
                      hộ kinh doanh, địa chỉ, thông tin ủy quyền và phạm vi hoạt
                      động.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-feature relative overflow-hidden p-6">
                <div className="relative z-10">
                  <h4 className="text-lg font-bold text-brand-primary">
                    Cần hỗ trợ thêm?
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    Trong lúc chờ kết quả, bạn có thể mở trang hướng dẫn để rà
                    soát lại checklist hoặc chuẩn bị bản scan tốt hơn.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("/guide")}
                    className="mt-4 btn-ghost px-0 py-0 text-sm"
                  >
                    Mở hướng dẫn
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
                <div className="absolute -bottom-5 -right-5 opacity-10">
                  <span className="material-symbols-outlined text-[120px] text-brand-primary">
                    support_agent
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};

type SummaryInfoProps = {
  label: string;
  value: string;
};

const SummaryInfo = ({ label, value }: SummaryInfoProps) => {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
      <p className="font-medium text-brand-deep">{value}</p>
    </div>
  );
};
