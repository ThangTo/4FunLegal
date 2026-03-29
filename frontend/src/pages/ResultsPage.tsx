import { useEffect, useState } from 'react';

import { cn } from '../lib/cn';
import { ProcedureStepper } from '../components/ProcedureStepper';
import { SiteLayout } from '../components/SiteLayout';
import { StatusBadge } from '../components/StatusBadge';
import { api, ReviewResultResponse } from '../lib/api';
import { withSubmissionId } from '../lib/procedure';
import { useResolvedSubmissionId, useSubmissionQuery } from '../lib/useSubmissionQuery';

const buildResumePath = (
  route: '/register' | '/documents' | '/processing' | '/results' | '/submit',
  submissionId: string,
  step?: number,
) =>
  route === '/register'
    ? withSubmissionId(`/register?step=${step ?? 1}`, submissionId)
    : withSubmissionId(route, submissionId);

const semanticStatusLabelMap: Record<
  ReviewResultResponse['documentChecks'][number]['status'],
  string
> = {
  checklist_only: 'Kiểm tra checklist',
  matched: 'Khớp',
  mismatch: 'Lệch thông tin',
  insufficient_evidence: 'Không đủ bằng chứng',
  possible_type_mismatch: 'Có thể sai loại tài liệu',
};

export const ResultsPage = () => {
  const { submissionId, isResolving } = useResolvedSubmissionId('/results');
  const { navigateWithSubmission } = useSubmissionQuery();
  const [result, setResult] = useState<ReviewResultResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    let cancelled = false;

    const loadResult = async () => {
      setIsLoading(true);

      try {
        const response = await api.getReviewResult(submissionId);

        if (!cancelled) {
          setResult(response);
          setErrorMessage('');
        }
      } catch (error) {
        try {
          const submission = await api.getSubmission(submissionId);

          if (!cancelled && submission.resumeTarget.route !== '/results') {
            window.location.replace(
              buildResumePath(
                submission.resumeTarget.route,
                submission.id,
                submission.resumeTarget.step,
              ),
            );
            return;
          }
        } catch {
          // Ignore fallback errors and surface the original failure below.
        }

        if (!cancelled) {
          setResult(null);
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải kết quả phân tích.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (isResolving || isLoading) {
    return (
      <SiteLayout>
        <main className="page-shell pt-28 md:pt-32">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              Đang tải kết quả phân tích...
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  if (!result) {
    return (
      <SiteLayout>
        <main className="page-shell pt-28 md:pt-32">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center">
              <p className="text-lg font-semibold text-brand-deep">
                Hiện chưa có kết quả phân tích khả dụng.
              </p>
              <p className="mt-3 text-text-muted">
                {errorMessage || 'Hồ sơ có thể đã thay đổi và cần được phân tích lại.'}
              </p>
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  const navigateFromTarget = (
    target: { route: '/register'; step: number } | { route: '/documents' },
  ) => {
    if (target.route === '/register') {
      navigateWithSubmission(`/register?step=${target.step}`, submissionId);
      return;
    }

    navigateWithSubmission('/documents', submissionId);
  };

  const isEligible = result.submissionStatus === 'eligible';
  const isSubmitted = result.submissionStatus === 'submitted';

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
              Kết quả kiểm tra hồ sơ
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              Đây là kết quả mới nhất được đồng bộ từ dịch vụ phân tích AI, bao gồm đối
              chiếu theo từng file và từng trường dữ liệu.
            </p>
          </header>

          <ProcedureStepper currentStep={6} />

          <section className="mb-12">
            <div className="card-soft rounded-feature p-8 md:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <StatusBadge tone={result.statusBanner.tone === 'warning' ? 'warning' : 'success'}>
                    {result.statusBanner.title}
                  </StatusBadge>
                  <h2 className="mt-4 text-4xl font-black tracking-tight text-brand-deep md:text-5xl">
                    {result.statusBanner.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-lg leading-relaxed text-text-muted">
                    {result.statusBanner.description}
                  </p>
                  {isSubmitted && result.finalSubmission ? (
                    <p className="mt-4 text-sm font-semibold text-brand-secondary">
                      Hồ sơ đã được nộp chính thức với mã biên nhận{' '}
                      {result.finalSubmission.confirmationNumber}
                    </p>
                  ) : null}
                </div>

                <div className="card-base min-w-[240px] rounded-panel p-6 text-center shadow-panel">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
                    Điểm đánh giá
                  </p>
                  <p className="mt-2 text-4xl font-black text-brand-deep">
                    {result.statusBanner.score}%
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-secondary">
                    {result.statusBanner.scoreLabel}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-10 lg:col-span-8">
              <section className="card-soft rounded-panel p-6">
                <h3 className="mb-6 text-2xl font-bold text-brand-deep">Tóm tắt</h3>
                <div className="space-y-4">
                  {result.summaryItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-4">
                      <span
                        className={cn(
                          'material-symbols-outlined mt-1',
                          item.tone === 'success' && 'text-brand-secondary',
                          item.tone === 'warning' && 'text-state-warning',
                          item.tone === 'error' && 'text-state-error',
                          item.tone === 'info' && 'text-brand-primary',
                        )}
                      >
                        {item.icon}
                      </span>
                      <p className="leading-relaxed text-text-base">{item.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-6 text-2xl font-bold text-brand-deep">Các điểm cần lưu ý</h3>
                <div className="space-y-6">
                  {result.findings.length > 0 ? (
                    result.findings.map((finding) => (
                      <article
                        key={finding.id}
                        className={cn(
                          'card-base rounded-panel border-l-4 p-6 shadow-panel',
                          finding.severity === 'critical'
                            ? 'border-l-state-error'
                            : 'border-l-state-warning',
                        )}
                      >
                        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <StatusBadge tone={finding.severity === 'critical' ? 'error' : 'warning'}>
                              {finding.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                            </StatusBadge>
                            <h4 className="mt-3 text-xl font-bold text-brand-deep">{finding.title}</h4>
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
                              Trường dữ liệu
                            </p>
                            <p className="font-semibold text-text-base">{finding.affectedField}</p>
                          </div>

                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                              Giá trị đọc được
                            </p>
                            <p className="font-semibold text-text-base">{finding.extractedValue}</p>
                          </div>

                          {finding.submittedValue ? (
                            <div className="md:col-span-2 rounded-xl bg-surface-subtle p-4">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                                Giá trị kê khai
                              </p>
                              <p className="font-medium text-brand-deep">{finding.submittedValue}</p>
                            </div>
                          ) : null}

                          {finding.sourceDocuments.length > 0 ? (
                            <div className="md:col-span-2">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                                File liên quan
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {finding.sourceDocuments.map((document) => (
                                  <span
                                    key={`${finding.id}-${document.documentId}`}
                                    className="rounded-full bg-surface-card px-3 py-2 text-xs font-semibold text-brand-deep"
                                  >
                                    {document.documentLabel}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="md:col-span-2">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                              Rủi ro
                            </p>
                            <p className="leading-relaxed text-text-base">{finding.rejectionReason}</p>
                          </div>

                          {finding.comparisons.length > 0 ? (
                            <div className="md:col-span-2 rounded-xl border border-border-base/50 bg-surface-card p-4">
                              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                                Đối chiếu evidence
                              </p>
                              <div className="space-y-3">
                                {finding.comparisons.map((comparison) => (
                                  <div
                                    key={comparison.id}
                                    className="rounded-lg bg-surface-subtle px-4 py-3"
                                  >
                                    <div className="flex flex-col gap-1 text-sm">
                                      <span className="font-semibold text-brand-deep">
                                        {comparison.fieldLabel}
                                      </span>
                                      <span className="text-text-muted">
                                        Kê khai: {comparison.submittedValue || '—'}
                                      </span>
                                      <span className="text-text-muted">
                                        Tài liệu: {comparison.extractedValue || '—'}
                                      </span>
                                      <span className="text-xs text-brand-primary">
                                        {comparison.reason}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {finding.legalBasis.length > 0 ? (
                            <div className="md:col-span-2 rounded-xl bg-brand-primary/5 p-4">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                                Căn cứ pháp lý
                              </p>
                              <p className="font-medium text-brand-secondary">
                                {finding.legalBasis.join(', ')}
                              </p>
                            </div>
                          ) : null}

                          <div className="md:col-span-2 rounded-xl bg-surface-subtle p-4">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                              Gợi ý
                            </p>
                            <p className="font-medium italic text-brand-secondary">{finding.suggestion}</p>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="card-soft rounded-panel p-6 text-sm text-text-muted">
                      Không phát hiện vấn đề nào trong lần phân tích mới nhất.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-6 text-2xl font-bold text-brand-deep">Đối chiếu tài liệu</h3>
                <div className="space-y-4">
                  {result.documentChecks.map((check) => (
                    <article
                      key={check.documentId}
                      className="card-base rounded-panel border border-border-base/50 p-6 shadow-panel"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-brand-deep">{check.documentLabel}</h4>
                          <p className="mt-1 text-sm text-text-muted">{check.originalName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            tone={
                              check.status === 'matched'
                                ? 'success'
                                : check.status === 'checklist_only'
                                  ? 'info'
                                  : 'warning'
                            }
                          >
                            {semanticStatusLabelMap[check.status]}
                          </StatusBadge>
                          {check.extractionConfidence ? (
                            <StatusBadge tone="info">
                              OCR {check.extractionConfidence}
                            </StatusBadge>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-text-muted">{check.summary}</p>

                      {Object.keys(check.extractedFields).length > 0 ? (
                        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                          {Object.entries(check.extractedFields).map(([key, value]) => (
                            <div key={`${check.documentId}-${key}`} className="rounded-xl bg-surface-subtle p-4">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                                {key}
                              </p>
                              <p className="mt-1 text-sm font-medium text-brand-deep">
                                {String(value) || '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {check.issues.length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {check.issues.map((issue) => (
                            <div
                              key={String(issue.id)}
                              className="rounded-xl border border-state-warning/20 bg-state-warning/10 p-4 text-sm text-text-base"
                            >
                              <p className="font-semibold text-brand-deep">{String(issue.title)}</p>
                              <p className="mt-1 text-text-muted">
                                {String(issue.rejectionReason || '')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-xl bg-surface-card p-4 text-sm text-text-muted">
                          Tài liệu này đã khớp với dữ liệu kê khai trong lần phân tích hiện tại.
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-6 text-2xl font-bold text-brand-deep">Tài liệu còn thiếu</h3>
                <div className="card-soft rounded-panel p-6">
                  <div className="space-y-3">
                    {result.missingDocuments.length > 0 ? (
                      result.missingDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="flex flex-col gap-4 rounded-xl border border-border-base/30 bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-3xl text-state-error">
                              description
                            </span>
                            <div>
                              <p className="font-bold text-brand-deep">{document.label}</p>
                              <p className="text-sm text-text-muted">{document.description}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigateFromTarget(document.target)}
                            className="btn-ghost px-0 py-0 text-brand-secondary"
                          >
                            Tải lên
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-surface-card p-4 text-sm text-text-muted">
                        Tất cả tài liệu bắt buộc đã có trong lần phân tích này.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:col-span-4">
              <div className="space-y-6 lg:sticky lg:top-28">
                <div className="overflow-hidden rounded-feature border border-border-base/70 bg-surface-card shadow-panel">
                  <div className="bg-brand-primary px-6 py-4">
                    <h3 className="font-bold text-text-inverse">Tóm tắt hồ sơ</h3>
                  </div>

                  <div className="space-y-4 p-6">
                    <ResultMeta label="Chủ hộ" value={result.ownerName} />
                    <ResultMeta label="Mã hồ sơ" value={result.submissionCode} mono />
                    <ResultMeta label="Hộ kinh doanh" value={result.businessName} />
                    {result.finalSubmission ? (
                      <>
                        <ResultMeta
                          label="Biên nhận"
                          value={result.finalSubmission.confirmationNumber}
                          mono
                        />
                        <ResultMeta
                          label="Thời điểm nộp"
                          value={new Date(result.finalSubmission.submittedAt).toLocaleString()}
                        />
                      </>
                    ) : null}
                  </div>
                </div>

                {result.legalBasis.length > 0 ? (
                  <div className="rounded-feature border border-border-base/70 bg-surface-card p-6 shadow-panel">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-brand-primary/60">
                      Căn cứ pháp lý chính
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.legalBasis.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-surface-subtle px-3 py-2 text-xs font-semibold text-brand-deep"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3">
                  {isEligible ? (
                    <button
                      type="button"
                      onClick={() => navigateWithSubmission('/submit', submissionId)}
                      className="btn-primary h-14 justify-center"
                    >
                      <span className="material-symbols-outlined">send</span>
                      Nộp chính thức
                    </button>
                  ) : null}
                  {isSubmitted ? (
                    <button
                      type="button"
                      onClick={() => navigateWithSubmission('/submit', submissionId)}
                      className="btn-primary h-14 justify-center"
                    >
                      <span className="material-symbols-outlined">receipt_long</span>
                      Xem biên nhận
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigateWithSubmission('/documents', submissionId)}
                    className="btn-outline h-14 justify-center"
                  >
                    <span className="material-symbols-outlined">cloud_upload</span>
                    Cập nhật tài liệu
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateWithSubmission('/assistant', submissionId)}
                    className="btn-secondary h-14 justify-center"
                  >
                    <span className="material-symbols-outlined">smart_toy</span>
                    Hỏi trợ lý AI
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-outline h-14 justify-center"
                  >
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                    In báo cáo
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

const ResultMeta = ({ label, value, mono = false }: ResultMetaProps) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
    <p className={cn('text-lg font-semibold text-text-base', mono && 'font-mono')}>{value}</p>
  </div>
);
