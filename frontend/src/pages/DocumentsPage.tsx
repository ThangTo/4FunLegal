import { useMemo, useState } from "react";

import {
  requiredProcedureDocuments,
  uploadedProcedureFiles,
} from "../features/procedure/mockReview";
import {
  ProcedureDraft,
  formatPhone,
} from "../features/procedure/procedureDraft";
import { ProcedureStepper } from "../components/ProcedureStepper";
import { SiteLayout } from "../components/SiteLayout";

type DocumentsPageProps = {
  draft: ProcedureDraft;
  onNavigate: (path: string) => void;
};

export const DocumentsPage = ({ draft, onNavigate }: DocumentsPageProps) => {
  const [uploadedFiles, setUploadedFiles] = useState(uploadedProcedureFiles);

  const checklistItems = useMemo(
    () =>
      requiredProcedureDocuments.map((item) => {
        const isUploaded = uploadedFiles.some((file) => file.id === item.id);

        if (isUploaded) {
          return { ...item, status: "uploaded" as const };
        }

        if (item.status === "uploaded") {
          return { ...item, status: "missing" as const };
        }

        return item;
      }),
    [uploadedFiles],
  );

  const uploadedCount = useMemo(
    () => checklistItems.filter((item) => item.status === "uploaded").length,
    [checklistItems],
  );

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
              Hoàn thiện hồ sơ tài liệu
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              Vui lòng cung cấp các giấy tờ cần thiết. Hệ thống AI sẽ tự động đọc
              và kiểm tra tính hợp lệ của tài liệu cho bạn.
            </p>
          </header>

          <ProcedureStepper currentStep={4} />

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            <section className="space-y-8 xl:col-span-2">
              <div className="rounded-feature border-2 border-dashed border-brand-primary/20 bg-surface-subtle p-8 text-center transition-colors hover:bg-surface-hero md:p-12">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10 transition-transform hover:scale-105">
                  <span className="material-symbols-outlined text-4xl text-brand-primary">
                    cloud_upload
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-text-base">
                  Kéo và thả tài liệu vào đây
                </h2>
                <p className="mt-2 text-text-muted">
                  Hỗ trợ định dạng PDF, DOC, DOCX, JPG, PNG (Tối đa 25MB)
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button type="button" className="btn-primary px-8 py-3.5">
                    <span className="material-symbols-outlined text-[20px]">
                      add_circle
                    </span>
                    Chọn tệp
                  </button>
                  <button type="button" className="btn-outline px-8 py-3.5">
                    <span className="material-symbols-outlined text-[20px]">
                      photo_camera
                    </span>
                    Chụp ảnh tài liệu
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="px-2 text-xl font-bold text-text-base">
                  Tệp đã tải lên
                </h3>
                {uploadedFiles.map((file) => (
                  <article
                    key={file.id}
                    className="card-base flex items-center gap-4 rounded-panel p-4 transition hover:shadow-panel"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-subtle">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-3xl text-brand-primary">
                          {file.icon}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-text-base">{file.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <span className="text-sm text-text-muted">{file.size}</span>
                        <span className="h-1 w-1 rounded-full bg-border-strong/50" />
                        <div
                          className={
                            file.status === "verified"
                              ? "flex items-center gap-1 text-sm font-medium text-brand-secondary"
                              : "flex items-center gap-1 text-sm font-medium text-brand-primary"
                          }
                        >
                          <span
                            className={`material-symbols-outlined text-xs ${
                              file.status === "processing" ? "animate-pulse" : ""
                            }`}
                            style={
                              file.status === "verified"
                                ? { fontVariationSettings: "'FILL' 1" }
                                : undefined
                            }
                          >
                            {file.status === "verified"
                              ? "verified"
                              : "settings_suggest"}
                          </span>
                          {file.statusLabel}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="rounded-full p-2 text-text-muted transition hover:bg-state-error/10 hover:text-state-error"
                      aria-label={`Xóa ${file.name}`}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </article>
                ))}
              </div>

              <div className="flex flex-col items-center justify-between gap-4 border-t border-border-base/70 pt-8 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onNavigate("/register")}
                  className="btn-ghost w-full justify-center rounded-xl px-6 py-4 sm:w-auto"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("/processing")}
                  className="btn-primary w-full justify-center px-10 py-4 text-lg shadow-panel sm:w-auto"
                >
                  Bắt đầu phân tích
                </button>
              </div>
            </section>

            <aside className="space-y-6 xl:sticky xl:top-32 xl:h-fit">
              <div className="card-soft rounded-feature p-6 shadow-card">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-brand-deep">
                    Danh sách hồ sơ
                  </h3>
                  <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-xs font-bold text-brand-primary">
                    {uploadedCount}/{requiredProcedureDocuments.length} tệp
                  </span>
                </div>

                <div className="space-y-4">
                  {checklistItems.map((document) => {
                    const baseClasses =
                      "flex items-center justify-between rounded-xl p-3";

                    if (document.status === "uploaded") {
                      return (
                        <div key={document.id} className={`${baseClasses} bg-surface-card`}>
                          <div className="flex items-center gap-3">
                            <span
                              className="material-symbols-outlined text-brand-secondary"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              check_circle
                            </span>
                            <span className="text-sm font-medium">{document.label}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-secondary">
                            Đã tải lên
                          </span>
                        </div>
                      );
                    }

                    if (document.status === "missing") {
                      return (
                        <div
                          key={document.id}
                          className={`${baseClasses} border border-state-error/10 bg-state-error/10`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="material-symbols-outlined text-state-error"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              error
                            </span>
                            <span className="text-sm font-medium">{document.label}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-state-error">
                            Còn thiếu
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={document.id} className={`${baseClasses} bg-surface-hero`}>
                        <div className="flex items-center gap-3 text-text-muted">
                          <span className="material-symbols-outlined">
                            radio_button_unchecked
                          </span>
                          <span className="text-sm font-medium">{document.label}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                          Cần thiết
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-panel bg-brand-primary p-4 text-text-inverse">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-brand-secondary">
                      auto_awesome
                    </span>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-text-inverse/70">
                        Gợi ý từ AI
                      </p>
                      <p className="text-sm leading-relaxed text-text-inverse/90">
                        Hợp đồng thuê địa điểm của bạn có thể cần chữ ký giáp lai
                        tại trang 2. Vui lòng kiểm tra lại trước khi gửi phân
                        tích.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-feature bg-gradient-to-br from-brand-secondary to-brand-primary p-6 text-text-inverse shadow-panel">
                <h4 className="text-lg font-bold">Thông tin hồ sơ hiện tại</h4>
                <div className="mt-4 space-y-4 text-sm">
                  <InfoRow label="Chủ hộ" value={draft.ownerName} />
                  <InfoRow label="Liên hệ" value={formatPhone(draft.phone)} />
                  <InfoRow label="Hộ kinh doanh" value={draft.businessName} />
                  <InfoRow label="Ngành chính" value={draft.mainIndustry} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};

type InfoRowProps = {
  label: string;
  value: string;
};

const InfoRow = ({ label, value }: InfoRowProps) => {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-inverse/65">
        {label}
      </p>
      <p className="font-medium text-text-inverse">{value}</p>
    </div>
  );
};
