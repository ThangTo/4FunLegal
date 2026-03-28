import { useEffect, useMemo, useState } from 'react';

import { cn } from '../lib/cn';
import { ProcedureStepper } from '../components/ProcedureStepper';
import { SiteLayout } from '../components/SiteLayout';
import { api, ReviewProcessingResponse } from '../lib/api';
import { withSubmissionId } from '../lib/procedure';
import { useResolvedSubmissionId, useSubmissionQuery } from '../lib/useSubmissionQuery';

export const ProcessingPage = () => {
  const { submissionId, isResolving } = useResolvedSubmissionId('/processing');
  const { navigateWithSubmission } = useSubmissionQuery();
  const [review, setReview] = useState<ReviewProcessingResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const pollReview = async () => {
      try {
        const latestReview = await api.getReviewLatest(submissionId);

        if (!cancelled) {
          setReview(latestReview);
          setErrorMessage('');
        }

        if ((latestReview.isComplete || latestReview.status === 'failed') && intervalId) {
          window.clearInterval(intervalId);
        }
      } catch (error) {
        try {
          const submission = await api.getSubmission(submissionId);

          if (!cancelled && submission.resumeTarget.route !== '/processing') {
            const nextPath =
              submission.resumeTarget.route === '/register'
                ? withSubmissionId(
                    `/register?step=${submission.resumeTarget.step ?? 1}`,
                    submission.id,
                  )
                : withSubmissionId(submission.resumeTarget.route, submission.id);

            window.location.replace(nextPath);
            return;
          }
        } catch {
          // Ignore fallback errors and surface the original request failure below.
        }

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải tiến độ phân tích.',
          );
        }
      }
    };

    void pollReview();
    intervalId = window.setInterval(() => {
      void pollReview();
    }, 1000);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [submissionId]);

  const isComplete = review?.isComplete ?? false;
  const isFailed = review?.status === 'failed';

  const remainingLabel = useMemo(() => {
    if (!review) {
      return 'Khoảng 2 phút';
    }

    if (review.status === 'failed') {
      return 'Phân tích thất bại';
    }

    if (review.isComplete) {
      return 'Đã hoàn tất';
    }

    return review.etaSeconds > 60 ? 'Khoảng 2 phút' : 'Khoảng 1 phút';
  }, [review]);

  const handleRetry = async () => {
    if (!submissionId || !isFailed) {
      return;
    }

    setIsRetrying(true);
    setErrorMessage('');

    try {
      await api.startReview(submissionId);
      const refreshedReview = await api.getReviewLatest(submissionId);
      setReview(refreshedReview);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể thử lại phân tích.');
    } finally {
      setIsRetrying(false);
    }
  };

  if (isResolving || !review) {
    return (
      <SiteLayout>
        <main className="page-shell pt-28 md:pt-32">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              {errorMessage || 'Đang tải trạng thái phân tích...'}
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
              Trạng thái xử lý hồ sơ
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              Gateway đang theo dõi tiến trình AI/OCR từ dịch vụ FastAPI và đồng bộ kết quả về hồ sơ của bạn.
            </p>
          </header>

          <ProcedureStepper currentStep={5} />

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
            <section className="lg:col-span-8">
              <div className="card-base rounded-feature border border-border-base/50 p-8 shadow-panel md:p-12">
                <header className="mb-12 text-center">
                  <div
                    className={cn(
                      'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full',
                      isComplete
                        ? 'bg-state-success/12 text-state-success'
                        : isFailed
                          ? 'bg-state-error/12 text-state-error'
                          : 'bg-surface-hero text-brand-primary',
                    )}
                  >
                    <span
                      className={cn(
                        'material-symbols-outlined text-4xl',
                        !isComplete && !isFailed && 'animate-spin [animation-duration:3s]',
                      )}
                      style={isComplete || isFailed ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {isComplete ? 'check_circle' : isFailed ? 'error' : 'sync'}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-brand-deep md:text-4xl">
                    {isComplete
                      ? 'Phân tích AI đã hoàn tất'
                      : isFailed
                        ? 'Phân tích AI thất bại'
                        : 'Hệ thống đang phân tích hồ sơ'}
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-text-muted">
                    {isComplete
                      ? 'Kết quả mới nhất đã sẵn sàng. Bạn có thể mở trang kết quả để tiếp tục.'
                      : isFailed
                        ? review.errorMessage || 'Dịch vụ AI chưa thể hoàn tất lần phân tích này.'
                        : 'Bạn có thể chờ tại trang này trong khi OCR và bước đối chiếu pháp lý tiếp tục chạy nền.'}
                  </p>
                </header>

                <div className="mx-auto max-w-2xl">
                  {review.timeline.map((item, index) => {
                    const isDone = item.state === 'completed';
                    const isActive = item.state === 'current' && !isComplete && !isFailed;
                    const isLast = index === review.timeline.length - 1;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'relative ml-4 flex gap-6',
                          !isLast && 'border-l-2 pb-8',
                          isDone ? 'border-brand-secondary/30' : 'border-border-base',
                        )}
                      >
                        <div
                          className={cn(
                            'absolute -left-[1.35rem] top-0 flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-surface-card',
                            isDone
                              ? 'bg-brand-secondary text-text-inverse'
                              : isActive
                                ? 'border-2 border-brand-secondary bg-surface-card text-brand-secondary shadow-card'
                                : 'bg-surface-hero text-text-muted',
                          )}
                        >
                          <span
                            className={cn(
                              'material-symbols-outlined text-xl',
                              isActive && 'animate-spin [animation-duration:3s]',
                            )}
                            style={isDone && !isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            {isDone && !isActive ? 'check' : item.icon}
                          </span>
                        </div>

                        <div className={cn('pl-6', item.state === 'pending' && 'opacity-60')}>
                          <h3 className={cn('text-lg font-bold', isActive ? 'text-brand-secondary' : 'text-brand-deep')}>
                            {item.title}
                          </h3>
                          <p className={cn('mt-1 text-sm', isActive ? 'font-medium text-brand-secondary' : 'text-text-muted')}>
                            {isDone
                              ? item.completedLabel
                              : isFailed
                                ? 'Quy trình đã dừng trước khi hoàn tất bước này.'
                                : isActive
                                  ? 'AI đang xử lý bước này...'
                                  : item.pendingLabel}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-16 flex flex-col items-center gap-6 border-t border-border-base/70 pt-10">
                  <div className="flex items-center gap-3 rounded-full bg-surface-subtle px-6 py-3">
                    <span className="material-symbols-outlined text-brand-primary">schedule</span>
                    <span className="font-medium text-brand-deep">
                      Trạng thái hiện tại: <strong className="text-brand-secondary">{remainingLabel}</strong>
                    </span>
                  </div>

                  {errorMessage ? (
                    <div className="w-full rounded-xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
                      {errorMessage}
                    </div>
                  ) : null}

                  <div className="mt-2 flex w-full flex-col justify-center gap-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => navigateWithSubmission('/documents', submissionId)}
                      className="btn-outline px-8 py-4"
                    >
                      Quay lại tài liệu
                    </button>
                    {isFailed ? (
                      <button
                        type="button"
                        onClick={() => void handleRetry()}
                        disabled={isRetrying}
                        className="btn-primary px-8 py-4 disabled:opacity-50"
                      >
                        {isRetrying ? 'Đang thử lại...' : 'Thử lại phân tích AI'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigateWithSubmission('/results', submissionId)}
                        disabled={!isComplete}
                        className="btn-primary px-8 py-4 disabled:opacity-50"
                      >
                        {isComplete ? 'Mở kết quả phân tích' : 'Đang chờ kết quả...'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-6 lg:sticky lg:top-32 lg:col-span-4">
              <div className="card-soft rounded-feature p-6 shadow-card">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-brand-deep">
                  <span className="material-symbols-outlined text-brand-primary">info</span>
                  Tóm tắt hồ sơ
                </h3>

                <div className="mb-8 rounded-panel bg-surface-card p-4 shadow-card">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        person
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
                        Chủ hộ
                      </p>
                      <p className="text-lg font-bold text-brand-deep">{review.summary.ownerName}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <SummaryInfo label="Liên hệ" value={review.summary.contact} />
                  <SummaryInfo label="Hộ kinh doanh" value={review.summary.businessName} />
                  <SummaryInfo label="Tệp đã tải lên" value={`${review.summary.uploadedCount} tệp`} />
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

const SummaryInfo = ({ label, value }: SummaryInfoProps) => (
  <div className="space-y-1">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
    <p className="font-medium text-brand-deep">{value}</p>
  </div>
);
