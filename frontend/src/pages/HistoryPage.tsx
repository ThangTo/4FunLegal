import { useMemo, useState } from "react";

import { cn } from "../lib/cn";
import { SiteLayout } from "../components/SiteLayout";

type HistoryPageProps = {
  onNavigate: (path: string) => void;
};

type HistoryStatus = "needs_fix" | "eligible" | "processing";
type HistoryType = "household" | "business";

type HistoryRecord = {
  id: string;
  name: string;
  icon: string;
  iconClassName: string;
  createdAt: string;
  updatedAt: string;
  status: HistoryStatus;
  issueCount: number | null;
  type: HistoryType;
};

const historyRecords: HistoryRecord[] = [
  {
    id: "HKD-2026-001",
    name: "Hộ kinh doanh Global Tech",
    icon: "description",
    iconClassName: "bg-state-warning/20 text-state-warning",
    createdAt: "2026-03-24",
    updatedAt: "2 giờ trước",
    status: "needs_fix",
    issueCount: 2,
    type: "household",
  },
  {
    id: "HKD-2026-002",
    name: "Cửa hàng Phở Việt",
    icon: "store",
    iconClassName: "bg-brand-secondary/15 text-brand-secondary",
    createdAt: "2026-03-22",
    updatedAt: "2 ngày trước",
    status: "eligible",
    issueCount: 0,
    type: "household",
  },
  {
    id: "HKD-2026-003",
    name: "Xưởng May Hà Nội",
    icon: "factory",
    iconClassName: "bg-brand-primary/15 text-brand-primary",
    createdAt: "2026-03-20",
    updatedAt: "4 ngày trước",
    status: "processing",
    issueCount: null,
    type: "business",
  },
  {
    id: "HKD-2026-004",
    name: "Tiệm Bánh Minh Châu",
    icon: "bakery_dining",
    iconClassName: "bg-brand-secondary/15 text-brand-secondary",
    createdAt: "2026-03-18",
    updatedAt: "6 ngày trước",
    status: "needs_fix",
    issueCount: 1,
    type: "household",
  },
  {
    id: "HKD-2026-005",
    name: "Cửa hàng Đặc sản Miền Trung",
    icon: "shopping_bag",
    iconClassName: "bg-brand-primary/15 text-brand-primary",
    createdAt: "2026-03-10",
    updatedAt: "2 tuần trước",
    status: "eligible",
    issueCount: 0,
    type: "household",
  },
  {
    id: "HKD-2026-006",
    name: "Dịch vụ Sửa xe Hưng Phát",
    icon: "build",
    iconClassName: "bg-state-warning/20 text-state-warning",
    createdAt: "2026-02-28",
    updatedAt: "3 tuần trước",
    status: "processing",
    issueCount: null,
    type: "business",
  },
];

const PAGE_SIZE = 3;

export const HistoryPage = ({ onNavigate }: HistoryPageProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return historyRecords.filter((record) => {
      const matchesSearch =
        query.length === 0 ||
        record.name.toLowerCase().includes(query) ||
        record.id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;

      const matchesType = typeFilter === "all" || record.type === typeFilter;

      const matchesTime =
        timeFilter === "all"
          ? true
          : timeFilter === "7d"
            ? ["2026-03-24", "2026-03-22", "2026-03-20"].includes(record.createdAt)
            : timeFilter === "30d"
              ? record.createdAt >= "2026-02-24"
              : true;

      return matchesSearch && matchesStatus && matchesType && matchesTime;
    });
  }, [search, statusFilter, timeFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRecords]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTimeFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTimeChange = (value: string) => {
    setTimeFilter(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
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
                Theo dõi và quản lý các yêu cầu kiểm tra hồ sơ của bạn thông qua
                hệ thống AI thông minh.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("/register")}
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
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Tìm kiếm hồ sơ..."
                  className="input-base h-14 pl-12"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(event) => handleStatusChange(event.target.value)}
                  className="select-base h-14"
                >
                  <option value="all">Trạng thái</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="needs_fix">Cần sửa đổi</option>
                  <option value="eligible">Đủ điều kiện</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={timeFilter}
                  onChange={(event) => handleTimeChange(event.target.value)}
                  className="select-base h-14"
                >
                  <option value="all">Thời gian</option>
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={typeFilter}
                  onChange={(event) => handleTypeChange(event.target.value)}
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

          <section className="overflow-hidden rounded-[2rem] bg-surface-subtle shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-card-alt text-left">
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Tên hồ sơ
                    </th>
                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Trạng thái
                    </th>
                    <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.18em] text-text-base">
                      Số lỗi
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
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="bg-surface-card transition-colors hover:bg-surface-base"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                record.iconClassName,
                              )}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {record.icon}
                              </span>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-brand-primary">
                                {record.name}
                              </p>
                              <p className="text-xs text-text-muted">{record.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-text-muted">
                          {formatDate(record.createdAt)}
                        </td>
                        <td className="px-6 py-6">
                          <HistoryStatusBadge status={record.status} />
                        </td>
                        <td
                          className={cn(
                            "px-6 py-6 font-semibold",
                            record.status === "needs_fix"
                              ? "text-state-error"
                              : "text-text-muted",
                          )}
                        >
                          {record.issueCount === null ? "-" : `${record.issueCount} lỗi`}
                        </td>
                        <td className="px-6 py-6 text-text-muted">
                          {record.updatedAt}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate(
                                  record.status === "processing"
                                    ? "/processing"
                                    : "/results",
                                )
                              }
                              className={cn(
                                "rounded-xl px-4 py-2 text-sm font-semibold",
                                record.status === "processing"
                                  ? "cursor-pointer bg-surface-hero text-text-muted hover:bg-surface-card-alt"
                                  : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15",
                              )}
                            >
                              {record.status === "processing"
                                ? "Chờ xử lý"
                                : "Xem kết quả"}
                            </button>
                            <button
                              type="button"
                              className="rounded-xl p-2 text-text-muted transition hover:bg-surface-card-alt hover:text-brand-primary"
                              aria-label={`Thao tác khác cho ${record.name}`}
                            >
                              <span className="material-symbols-outlined">
                                more_vert
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-16">
                        <div className="mx-auto max-w-lg text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-hero text-brand-primary">
                            <span className="material-symbols-outlined text-3xl">
                              search_off
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-brand-deep">
                            Không tìm thấy hồ sơ phù hợp
                          </h3>
                          <p className="mt-2 text-text-muted">
                            Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc
                            để xem thêm hồ sơ khác.
                          </p>
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="btn-outline mt-6"
                          >
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
                Hiển thị{" "}
                {filteredRecords.length === 0
                  ? "0"
                  : `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(
                      currentPage * PAGE_SIZE,
                      filteredRecords.length,
                    )}`}{" "}
                trong số {filteredRecords.length} hồ sơ
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

                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={cn(
                        "h-10 w-10 rounded-xl text-sm font-bold transition",
                        currentPage === pageNumber
                          ? "bg-brand-primary text-text-inverse"
                          : "bg-surface-card text-text-base hover:bg-surface-card-alt",
                      )}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
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

type HistoryStatusBadgeProps = {
  status: HistoryStatus;
};

const HistoryStatusBadge = ({ status }: HistoryStatusBadgeProps) => {
  if (status === "needs_fix") {
    return (
      <span className="inline-flex items-center rounded-full bg-state-error/12 px-3 py-1 text-sm font-medium text-state-error">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-state-error" />
        Cần sửa đổi
      </span>
    );
  }

  if (status === "eligible") {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-secondary/12 px-3 py-1 text-sm font-medium text-brand-secondary">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brand-secondary" />
        Đủ điều kiện
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
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
};
