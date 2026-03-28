import { useEffect, useState } from 'react';

import { ProcedureStepper } from '../components/ProcedureStepper';
import { SiteLayout } from '../components/SiteLayout';
import { formatPhone } from '../features/procedure/procedureDraft';
import { api, DocumentsResponse, SubmissionDetail } from '../lib/api';
import { withSubmissionId } from '../lib/procedure';
import { useResolvedSubmissionId, useSubmissionQuery } from '../lib/useSubmissionQuery';

export const FinalSubmissionPage = () => {
  const { submissionId, isResolving } = useResolvedSubmissionId('/submit');
  const { navigateWithSubmission } = useSubmissionQuery();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSnapshot, setConfirmSnapshot] = useState(false);
  const [confirmDocuments, setConfirmDocuments] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    let cancelled = false;

    const loadPage = async () => {
      setIsLoading(true);

      try {
        const [submissionResponse, documentsResponse] = await Promise.all([
          api.getSubmission(submissionId),
          api.getDocuments(submissionId),
        ]);

        if (cancelled) {
          return;
        }

        if (
          submissionResponse.status !== 'eligible' &&
          submissionResponse.status !== 'submitted'
        ) {
          const nextPath =
            submissionResponse.resumeTarget.route === '/register'
              ? withSubmissionId(
                  `/register?step=${submissionResponse.resumeTarget.step ?? 1}`,
                  submissionResponse.id,
                )
              : withSubmissionId(
                  submissionResponse.resumeTarget.route,
                  submissionResponse.id,
                );

          window.location.replace(nextPath);
          return;
        }

        setSubmission(submissionResponse);
        setDocuments(documentsResponse);
        setErrorMessage('');
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải trang nộp chính thức.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const handleSubmit = async () => {
    if (!submissionId || !submission) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const submitted = await api.submitSubmission(submissionId);
      setSubmission(submitted);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể nộp hồ sơ chính thức.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isResolving || isLoading || !submission || !documents) {
    return (
      <SiteLayout>
        <main className="page-shell pt-28 md:pt-32">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              {errorMessage || 'Đang tải trang nộp chính thức...'}
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  const isSubmitted = submission.status === 'submitted' && Boolean(submission.finalSubmission);
  const canSubmit = confirmSnapshot && confirmDocuments && confirmSubmit && !isSubmitting;

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
              {isSubmitted ? 'Biên nhận nộp hồ sơ' : 'Nộp chính thức hồ sơ'}
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              {isSubmitted
                ? 'Hồ sơ đã được chuyển sang trạng thái đã nộp và khóa chỉnh sửa.'
                : 'Rà soát lần cuối trước khi tạo biên nhận nội bộ cho hồ sơ này.'}
            </p>
          </header>

          <ProcedureStepper currentStep={7} />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <section className="space-y-8 lg:col-span-8">
              <div className="card-soft rounded-feature p-8 shadow-card">
                <h2 className="mb-6 text-2xl font-bold text-brand-deep">Tóm tắt hồ sơ cuối cùng</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <SnapshotItem label="Chủ hộ" value={submission.draft.ownerName || '-'} />
                  <SnapshotItem label="Số điện thoại" value={formatPhone(submission.draft.phone || '-')} />
                  <SnapshotItem label="Email" value={submission.draft.email || '-'} />
                  <SnapshotItem label="Số định danh" value={submission.draft.nationalId || '-'} />
                  <SnapshotItem label="Tên hộ kinh doanh" value={submission.draft.businessName || '-'} />
                  <SnapshotItem label="Loại hình" value={submission.draft.businessModel || '-'} />
                  <SnapshotItem label="Địa chỉ kinh doanh" value={submission.draft.businessAddress || '-'} />
                  <SnapshotItem label="Ngành nghề chính" value={submission.draft.mainIndustry || '-'} />
                </div>
              </div>

              <div className="card-soft rounded-feature p-8 shadow-card">
                <h2 className="mb-6 text-2xl font-bold text-brand-deep">Tài liệu sẵn sàng</h2>
                <div className="space-y-3">
                  {documents.uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl bg-surface-card p-4"
                    >
                      <div>
                        <p className="font-semibold text-brand-deep">{file.label}</p>
                        <p className="text-sm text-text-muted">{file.name}</p>
                      </div>
                      <span className="text-sm font-medium text-brand-secondary">
                        {file.statusLabel || 'Sẵn sàng'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {isSubmitted && submission.finalSubmission ? (
                <div className="card-base rounded-feature border border-brand-secondary/30 p-8 shadow-panel">
                  <h2 className="mb-6 text-2xl font-bold text-brand-deep">Biên nhận nội bộ</h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <SnapshotItem
                      label="Mã biên nhận"
                      value={submission.finalSubmission.confirmationNumber}
                      mono
                    />
                    <SnapshotItem label="Kênh nộp" value={submission.finalSubmission.channel} />
                    <SnapshotItem
                      label="Thời điểm nộp"
                      value={new Date(submission.finalSubmission.submittedAt).toLocaleString()}
                    />
                    <SnapshotItem
                      label="Mã theo dõi ngoài hệ thống"
                      value={submission.finalSubmission.externalTrackingCode || 'Chờ tích hợp'}
                    />
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="space-y-6 lg:sticky lg:top-28 lg:col-span-4">
              <div className="card-base rounded-feature p-6 shadow-panel">
                <h3 className="mb-6 text-xl font-bold text-brand-deep">
                  {isSubmitted ? 'Trạng thái hồ sơ' : 'Danh sách xác nhận'}
                </h3>

                {isSubmitted ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-brand-secondary/12 px-4 py-3 text-sm font-semibold text-brand-secondary">
                      Đã nộp thành công
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateWithSubmission('/history', submissionId)}
                      className="btn-outline w-full justify-center"
                    >
                      Mở lịch sử hồ sơ
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateWithSubmission('/register?mode=new', null)}
                      className="btn-primary w-full justify-center"
                    >
                      Tạo hồ sơ mới
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 rounded-xl bg-surface-card p-4">
                      <input
                        type="checkbox"
                        checked={confirmSnapshot}
                        onChange={(event) => setConfirmSnapshot(event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="text-sm text-text-base">
                        Tôi đã kiểm tra bản tóm tắt cuối cùng và thông tin chủ hộ, hộ kinh doanh.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl bg-surface-card p-4">
                      <input
                        type="checkbox"
                        checked={confirmDocuments}
                        onChange={(event) => setConfirmDocuments(event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="text-sm text-text-base">
                        Tôi xác nhận tất cả tài liệu bắt buộc đã được đính kèm và phân loại đúng.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl bg-surface-card p-4">
                      <input
                        type="checkbox"
                        checked={confirmSubmit}
                        onChange={(event) => setConfirmSubmit(event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="text-sm text-text-base">
                        Tôi hiểu thao tác này sẽ khóa hồ sơ để chỉnh sửa.
                      </span>
                    </label>

                    {errorMessage ? (
                      <div className="rounded-xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
                        {errorMessage}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={!canSubmit}
                      className="btn-primary w-full justify-center disabled:opacity-50"
                    >
                      {isSubmitting ? 'Đang nộp...' : 'Xác nhận nộp chính thức'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateWithSubmission('/results', submissionId)}
                      className="btn-outline w-full justify-center"
                    >
                      Quay lại kết quả
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};

type SnapshotItemProps = {
  label: string;
  value: string;
  mono?: boolean;
};

const SnapshotItem = ({ label, value, mono = false }: SnapshotItemProps) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
    <p className={mono ? 'font-mono text-base font-semibold text-brand-deep' : 'text-base font-semibold text-brand-deep'}>
      {value}
    </p>
  </div>
);
