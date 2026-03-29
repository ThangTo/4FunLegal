import { useEffect, useRef, useState } from 'react';

import { ProcedureStepper } from '../components/ProcedureStepper';
import { SiteLayout } from '../components/SiteLayout';
import { ProcedureDraft, formatPhone, initialProcedureDraft } from '../features/procedure/procedureDraft';
import { api, DocumentsResponse, ProcedureFile, SubmissionDetail } from '../lib/api';
import { withSubmissionId } from '../lib/procedure';
import { useResolvedSubmissionId, useSubmissionQuery } from '../lib/useSubmissionQuery';

const documentTypeOptions: Array<{
  value: ProcedureFile['documentType'];
  label: string;
}> = [
  { value: 'citizen-id', label: 'CCCD/Hộ chiếu' },
  { value: 'application', label: 'Đơn đăng ký' },
  { value: 'lease-contract', label: 'Hợp đồng thuê địa điểm' },
  { value: 'authorization', label: 'Văn bản ủy quyền' },
  { value: 'practice-license', label: 'Chứng chỉ hành nghề' },
  { value: 'household-member-consent', label: 'Biên bản họp thành viên hộ gia đình' },
  { value: 'other', label: 'Tài liệu bổ sung' },
];

const buildSubmissionPath = (submission: SubmissionDetail) =>
  submission.resumeTarget.route === '/register'
    ? withSubmissionId(`/register?step=${submission.resumeTarget.step ?? 1}`, submission.id)
    : withSubmissionId(submission.resumeTarget.route, submission.id);

export const DocumentsPage = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { submissionId, isResolving } = useResolvedSubmissionId('/documents');
  const { navigateWithSubmission } = useSubmissionQuery();

  const [draft, setDraft] = useState<ProcedureDraft>(initialProcedureDraft);
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [changingDocumentId, setChangingDocumentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showReanalysisNotice, setShowReanalysisNotice] = useState(false);

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    let cancelled = false;

    const loadPageData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [submissionResponse, documentState] = await Promise.all([
          api.getSubmission(submissionId),
          api.getDocuments(submissionId),
        ]);

        if (cancelled) {
          return;
        }

        if (submissionResponse.isLocked) {
          window.location.replace(buildSubmissionPath(submissionResponse));
          return;
        }

        setDraft(submissionResponse.draft);
        setSubmission(submissionResponse);
        setDocuments(documentState);
        setShowReanalysisNotice(
          submissionResponse.status === 'needs_fix' || submissionResponse.status === 'eligible',
        );
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải tài liệu.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [navigateWithSubmission, submissionId]);

  const refreshSubmissionState = async () => {
    if (!submissionId) {
      return;
    }

    const latestSubmission = await api.getSubmission(submissionId);
    setSubmission(latestSubmission);
    setDraft(latestSubmission.draft);
  };

  const handlePickFiles = () => {
    inputRef.current?.click();
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!submissionId || !files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      const nextState = await api.uploadDocuments(submissionId, Array.from(files));
      setDocuments(nextState);
      await refreshSubmissionState();
      setShowReanalysisNotice(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải tệp.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!submissionId) {
      return;
    }

    try {
      const nextState = await api.deleteDocument(submissionId, documentId);
      setDocuments(nextState);
      await refreshSubmissionState();
      setShowReanalysisNotice(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa tài liệu.');
    }
  };

  const handleChangeDocumentType = async (
    documentId: string,
    documentType: ProcedureFile['documentType'],
  ) => {
    if (!submissionId) {
      return;
    }

    setChangingDocumentId(documentId);
    setErrorMessage('');

    try {
      const nextState = await api.updateDocumentType(submissionId, documentId, documentType);
      setDocuments(nextState);
      await refreshSubmissionState();
      setShowReanalysisNotice(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật loại tài liệu.');
    } finally {
      setChangingDocumentId(null);
    }
  };

  const handleStartReview = async () => {
    if (!submissionId || !documents?.summary.canStartReview) {
      setErrorMessage('Hãy hoàn tất phần kê khai và tải đủ tài liệu bắt buộc trước khi phân tích.');
      return;
    }

    try {
      await api.startReview(submissionId);
      navigateWithSubmission('/processing', submissionId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể bắt đầu phân tích.');
    }
  };

  if (isResolving || isLoading || !documents || !submission) {
    return (
      <SiteLayout>
        <main className="page-shell pt-28 md:pt-32">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              Đang tải hồ sơ tài liệu...
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
              Hoàn thiện hồ sơ tài liệu
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              Tải lên đúng loại giấy tờ để hệ thống AI kiểm tra tính đầy đủ và nhất quán của hồ sơ.
            </p>
          </header>

          <ProcedureStepper currentStep={4} />

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            <section className="space-y-8 xl:col-span-2">
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => void handleFilesSelected(event.target.files)}
              />

              <div className="rounded-feature border-2 border-dashed border-brand-primary/20 bg-surface-subtle p-8 text-center transition-colors hover:bg-surface-hero md:p-12">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10 transition-transform hover:scale-105">
                  <span className="material-symbols-outlined text-4xl text-brand-primary">
                    cloud_upload
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-text-base">Kéo và thả tài liệu vào đây</h2>
                <p className="mt-2 text-text-muted">
                  Hỗ trợ PDF, DOC, DOCX, JPG, PNG. Sau khi tải lên, bạn có thể đổi lại loại giấy tờ nếu hệ thống đoán sai.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button type="button" onClick={handlePickFiles} className="btn-primary px-8 py-3.5">
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    {isUploading ? 'Đang tải...' : 'Chọn tệp'}
                  </button>
                  <button type="button" onClick={handlePickFiles} className="btn-outline px-8 py-3.5">
                    <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                    Chụp ảnh tài liệu
                  </button>
                </div>
              </div>

              {showReanalysisNotice ? (
                <div className="rounded-xl border border-state-warning/20 bg-state-warning/10 px-4 py-3 text-sm text-brand-deep">
                  Mọi thay đổi tài liệu sẽ làm mới kết quả phân tích cũ. Hãy chạy lại AI sau khi hoàn tất cập nhật.
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
                  {errorMessage}
                </div>
              ) : null}

              <div className="space-y-4">
                <h3 className="px-2 text-xl font-bold text-text-base">Tệp đã tải lên</h3>
                {documents.uploadedFiles.length > 0 ? (
                  documents.uploadedFiles.map((file) => (
                    <article
                      key={file.id}
                      className="card-base rounded-panel p-4 transition hover:shadow-panel"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-subtle">
                          {file.preview ? (
                            <img src={file.preview} alt={file.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-3xl text-brand-primary">
                              {file.icon || 'description'}
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
                                file.status === 'verified'
                                  ? 'flex items-center gap-1 text-sm font-medium text-brand-secondary'
                                  : 'flex items-center gap-1 text-sm font-medium text-brand-primary'
                              }
                            >
                              <span
                                className={`material-symbols-outlined text-xs ${
                                  file.status === 'processing' ? 'animate-pulse' : ''
                                }`}
                                style={
                                  file.status === 'verified'
                                    ? { fontVariationSettings: "'FILL' 1" }
                                    : undefined
                                }
                              >
                                {file.status === 'verified' ? 'verified' : 'settings_suggest'}
                              </span>
                              {file.statusLabel}
                            </div>
                            {file.semanticStatusLabel ? (
                              <>
                                <span className="h-1 w-1 rounded-full bg-border-strong/50" />
                                <span className="text-sm font-medium text-brand-deep">
                                  {file.semanticStatusLabel}
                                </span>
                              </>
                            ) : null}
                          </div>
                          {file.semanticIssues?.length ? (
                            <p className="mt-2 text-xs text-state-warning">
                              {file.semanticIssues.length} vấn đề semantic cần rà soát sau lần phân tích gần nhất.
                            </p>
                          ) : null}
                        </div>

                        <div className="grid gap-3 md:min-w-[280px]">
                          <select
                            className="select-base h-12"
                            value={file.documentType}
                            onChange={(event) =>
                              void handleChangeDocumentType(
                                file.id,
                                event.target.value as ProcedureFile['documentType'],
                              )
                            }
                            disabled={changingDocumentId === file.id}
                          >
                            {documentTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => void handleDelete(file.id)}
                            className="btn-outline justify-center px-4 py-2 text-sm"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Xóa tài liệu
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-panel border border-border-base/60 bg-surface-card p-6 text-sm text-text-muted">
                    Chưa có tài liệu nào được tải lên. Hãy bắt đầu bằng các giấy tờ bắt buộc ở danh sách bên phải.
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-between gap-4 border-t border-border-base/70 pt-8 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigateWithSubmission(`/register?step=${submission.resumeTarget.step ?? 3}`, submissionId)}
                  className="btn-ghost w-full justify-center rounded-xl px-6 py-4 sm:w-auto"
                >
                  Quay lại kê khai
                </button>
                <button
                  type="button"
                  onClick={() => void handleStartReview()}
                  disabled={!documents.summary.canStartReview || isUploading || changingDocumentId !== null}
                  className="btn-primary w-full justify-center px-10 py-4 text-lg shadow-panel disabled:opacity-50 sm:w-auto"
                >
                  Bắt đầu phân tích
                </button>
              </div>
            </section>

            <aside className="space-y-6 xl:sticky xl:top-32 xl:h-fit">
              <div className="card-soft rounded-feature p-6 shadow-card">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-brand-deep">Checklist tài liệu</h3>
                  <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-xs font-bold text-brand-primary">
                    {documents.summary.uploadedRequiredCount}/{documents.summary.requiredCount} bắt buộc
                  </span>
                </div>

                <div className="space-y-4">
                  {documents.checklist.map((document) => {
                    const baseClasses = 'rounded-xl p-3';

                    if (document.status === 'uploaded') {
                      return (
                        <div key={document.id} className={`${baseClasses} bg-surface-card`}>
                          <div className="flex items-center justify-between gap-3">
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
                              Đã đủ
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (document.status === 'missing_required') {
                      return (
                        <div key={document.id} className={`${baseClasses} border border-state-error/10 bg-state-error/10`}>
                          <div className="flex items-start gap-3">
                            <span
                              className="material-symbols-outlined mt-0.5 text-state-error"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              error
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{document.label}</span>
                                <span className="rounded-full bg-state-error/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-state-error">
                                  Bắt buộc
                                </span>
                              </div>
                              {document.reason ? (
                                <p className="mt-1 text-xs text-text-muted">{document.reason}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={document.id} className={`${baseClasses} bg-surface-hero`}>
                        <div className="flex items-start gap-3 text-text-muted">
                          <span className="material-symbols-outlined mt-0.5">info</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{document.label}</span>
                              <span className="rounded-full bg-surface-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                                Điều kiện
                              </span>
                            </div>
                            {document.reason ? (
                              <p className="mt-1 text-xs text-text-muted">{document.reason}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-panel bg-brand-primary p-4 text-text-inverse">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-brand-secondary">auto_awesome</span>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-text-inverse/70">
                        Gợi ý từ AI
                      </p>
                      <p className="text-sm leading-relaxed text-text-inverse/90">
                        {documents.summary.aiHint}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-feature bg-gradient-to-br from-brand-secondary to-brand-primary p-6 text-text-inverse shadow-panel">
                <h4 className="text-lg font-bold">Thông tin hồ sơ hiện tại</h4>
                <div className="mt-4 space-y-4 text-sm">
                  <InfoRow label="Chủ hộ" value={draft.ownerName || 'Chưa cập nhật'} />
                  <InfoRow label="Liên hệ" value={formatPhone(draft.phone || 'Chưa cập nhật')} />
                  <InfoRow label="Hộ kinh doanh" value={draft.businessName || 'Chưa cập nhật'} />
                  <InfoRow label="Ngành chính" value={draft.mainIndustry || 'Chưa cập nhật'} />
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

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className="space-y-1">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-inverse/65">{label}</p>
    <p className="font-medium text-text-inverse">{value}</p>
  </div>
);
