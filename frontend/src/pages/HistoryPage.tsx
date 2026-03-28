import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '../lib/cn';
import { SiteLayout } from '../components/SiteLayout';
import { api, SubmissionListItem, SubmissionStatus } from '../lib/api';
import { withSubmissionId } from '../lib/procedure';

type HistoryType = 'household' | 'business' | 'all';

const PAGE_SIZE = 5;

const iconByType: Record<HistoryType | 'default', { icon: string; className: string }> = {
  household: {
    icon: 'store',
    className: 'bg-brand-secondary/15 text-brand-secondary',
  },
  business: {
    icon: 'factory',
    className: 'bg-brand-primary/15 text-brand-primary',
  },
  default: {
    icon: 'description',
    className: 'bg-state-warning/20 text-state-warning',
  },
  all: {
    icon: 'description',
    className: 'bg-state-warning/20 text-state-warning',
  },
};

const getRecordAction = (record: SubmissionListItem) => {
  if (record.resumeTarget.route === '/register') {
    return {
      label: 'Tiếp tục kê khai',
      path: withSubmissionId(`/register?step=${record.resumeTarget.step ?? 1}`, record.id),
      className: 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15',
    };
  }

  if (record.resumeTarget.route === '/documents') {
    return {
      label: 'Mở tài liệu',
      path: withSubmissionId('/documents', record.id),
      className: 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15',
    };
  }

  if (record.resumeTarget.route === '/processing') {
    return {
      label: 'Xem xử lý',
      path: withSubmissionId('/processing', record.id),
      className: 'bg-surface-hero text-text-muted hover:bg-surface-card-alt',
    };
  }

  if (record.resumeTarget.route === '/submit') {
    return {
      label: 'Xem biên nhận',
      path: withSubmissionId('/submit', record.id),
      className: 'bg-brand-secondary/12 text-brand-secondary hover:bg-brand-secondary/18',
    };
  }

  return {
    label: 'Xem kết quả',
    path: withSubmissionId('/results', record.id),
    className: 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15',
  };
};

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<HistoryType>('all');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<SubmissionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const response = await api.listSubmissions({
          search,
          status: statusFilter === 'all' ? undefined : statusFilter,
          type: typeFilter === 'all' ? undefined : typeFilter,
          page,
          limit: PAGE_SIZE,
        });

        if (!cancelled) {
          setRecords(response.items);
          setTotal(response.pagination.total);
          setErrorMessage('');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải lịch sử hồ sơ.');
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [page, search, statusFilter, typeFilter]);

  const filteredRecords = useMemo(() => {
    if (timeFilter === 'all') {
      return records;
    }

    const thresholdDays = timeFilter === '7d' ? 7 : 30;
    const thresholdDate = Date.now() - thresholdDays * 86_400_000;

    return records.filter((record) => new Date(record.createdAt).getTime() >= thresholdDate);
  }, [records, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTimeFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <section className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="text-[3rem] font-black leading-tight tracking-tight text-brand-deep md:text-[3.5rem]">
                Lịch sử hồ sơ
              </h1>
              <p className="max-w-2xl text-lg text-text-muted">
                Theo dõi tất cả hồ sơ đang kê khai, đang phân tích, đã đủ điều kiện và đã nộp chính thức.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/register?mode=new')}
              className="btn-primary h-14 px-8"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Tạo hồ sơ mới
            </button>
          </section>

          <section className="card-soft mb-8 rounded-feature p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
              <div className="relative lg:col-span-5">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm mã hồ sơ hoặc tên hồ sơ..."
                  className="input-base h-14 pl-12"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as typeof statusFilter);
                    setPage(1);
                  }}
                  className="select-base h-14"
                >
                  <option value="all">Trạng thái</option>
                  <option value="draft">Bản nháp</option>
                  <option value="documents_pending">Chờ tài liệu</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="needs_fix">Cần sửa</option>
                  <option value="eligible">Đủ điều kiện</option>
                  <option value="submitted">Đã nộp</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value)}
                  className="select-base h-14"
                >
                  <option value="all">Thời gian</option>
                  <option value="7d">7 ngày gần đây</option>
                  <option value="30d">30 ngày gần đây</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as HistoryType);
                    setPage(1);
                  }}
                  className="select-base h-14"
                >
                  <option value="all">Loại hồ sơ</option>
                  <option value="household">Hộ kinh doanh</option>
                  <option value="business">Doanh nghiệp</option>
                </select>
              </div>

              <div className="flex justify-end lg:col-span-1">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="btn-outline h-14 w-14 px-0"
                  aria-label="Đặt lại bộ lọc"
                >
                  <span className="material-symbols-outlined">tune</span>
                </button>
              </div>
            </div>
          </section>

          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
              {errorMessage}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-[2rem] bg-surface-subtle shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-card-alt text-left">
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Hồ sơ
                    </th>
                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Trạng thái
                    </th>
                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Vấn đề
                    </th>
                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Cập nhật
                    </th>
                    <th className="px-8 py-5 text-right text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border-base/70">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => {
                      const iconMeta = iconByType[record.type] ?? iconByType.default;
                      const action = getRecordAction(record);

                      return (
                        <tr
                          key={record.id}
                          className="bg-surface-card transition-colors hover:bg-surface-base"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-xl',
                                  iconMeta.className,
                                )}
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  {iconMeta.icon}
                                </span>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-brand-primary">{record.name}</p>
                                <p className="text-xs text-text-muted">{record.submissionCode}</p>
                                {record.finalSubmission?.confirmationNumber ? (
                                  <p className="text-xs text-brand-secondary">
                                    Biên nhận: {record.finalSubmission.confirmationNumber}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-text-muted">{formatDate(record.createdAt)}</td>
                          <td className="px-6 py-6">
                            <HistoryStatusBadge status={record.status} />
                          </td>
                          <td
                            className={cn(
                              'px-6 py-6 font-semibold',
                              record.status === 'needs_fix' ? 'text-state-error' : 'text-text-muted',
                            )}
                          >
                            {record.issueCount === null ? '-' : `${record.issueCount} mục`}
                          </td>
                          <td className="px-6 py-6 text-text-muted">{formatRelative(record.updatedAt)}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(action.path)}
                                className={cn(
                                  'rounded-xl px-4 py-2 text-sm font-semibold',
                                  action.className,
                                )}
                              >
                                {action.label}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-16">
                        <div className="mx-auto max-w-lg text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-hero text-brand-primary">
                            <span className="material-symbols-outlined text-3xl">search_off</span>
                          </div>
                          <h3 className="text-xl font-bold text-brand-deep">Không tìm thấy hồ sơ</h3>
                          <p className="mt-2 text-text-muted">
                            Hãy thử từ khóa khác hoặc đặt lại bộ lọc.
                          </p>
                          <button type="button" onClick={resetFilters} className="btn-outline mt-6">
                            Đặt lại bộ lọc
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 bg-surface-subtle px-8 py-6 sm:flex-row sm:items-center">
              <span className="text-sm text-text-muted">
                Hiển thị{' '}
                {filteredRecords.length === 0
                  ? '0'
                  : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, total)}`}{' '}
                trên tổng số {total} hồ sơ
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="btn-outline h-10 w-10 px-0 disabled:opacity-50"
                  aria-label="Trang trước"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      'h-10 w-10 rounded-xl text-sm font-bold transition',
                      currentPage === pageNumber
                        ? 'bg-brand-primary text-text-inverse'
                        : 'bg-surface-card text-text-base hover:bg-surface-card-alt',
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-outline h-10 w-10 px-0 disabled:opacity-50"
                  aria-label="Trang sau"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </SiteLayout>
  );
};

const HistoryStatusBadge = ({ status }: { status: SubmissionStatus }) => {
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-hero px-3 py-1 text-sm font-medium text-brand-primary">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brand-primary" />
        Bản nháp
      </span>
    );
  }

  if (status === 'documents_pending') {
    return (
      <span className="inline-flex items-center rounded-full bg-state-warning/12 px-3 py-1 text-sm font-medium text-state-warning">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-state-warning" />
        Chờ tài liệu
      </span>
    );
  }

  if (status === 'needs_fix') {
    return (
      <span className="inline-flex items-center rounded-full bg-state-error/12 px-3 py-1 text-sm font-medium text-state-error">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-state-error" />
        Cần sửa
      </span>
    );
  }

  if (status === 'eligible') {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-secondary/12 px-3 py-1 text-sm font-medium text-brand-secondary">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brand-secondary" />
        Đủ điều kiện
      </span>
    );
  }

  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-secondary/12 px-3 py-1 text-sm font-medium text-brand-secondary">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brand-secondary" />
        Đã nộp
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-medium text-brand-primary">
      <span className="mr-2 h-1.5 w-1.5 rounded-full animate-pulse bg-brand-primary" />
      Đang xử lý
    </span>
  );
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatRelative = (value: string) => {
  const diffHours = Math.round((Date.now() - new Date(value).getTime()) / 3_600_000);

  if (diffHours < 24) {
    return `${Math.max(1, diffHours)} giờ trước`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ngày trước`;
};
