import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SiteLayout } from '../components/SiteLayout';
import { api, LibraryDocumentDetail } from '../lib/api';

const buildSupportPath = (document: LibraryDocumentDetail) => {
  const search = new URLSearchParams();
  search.set('documentTitle', document.title);
  search.set('documentSummary', document.summary);
  search.set('documentSlug', document.slug);
  return `/support?${search.toString()}`;
};

export const LibraryDocumentDetailPage = () => {
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const [documentDetail, setDocumentDetail] = useState<LibraryDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      setIsLoading(true);

      try {
        const response = await api.getLibraryDocumentDetail(slug);

        if (!cancelled) {
          setDocumentDetail(response);
          setErrorMessage('');
        }
      } catch (error) {
        if (!cancelled) {
          setDocumentDetail(null);
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải chi tiết tài liệu.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const supportPath = useMemo(
    () => (documentDetail ? buildSupportPath(documentDetail) : '/support'),
    [documentDetail],
  );

  if (isLoading) {
    return (
      <SiteLayout>
        <main className="page-shell pt-24 md:pt-28">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              Đang tải chi tiết tài liệu...
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  if (!documentDetail) {
    return (
      <SiteLayout>
        <main className="page-shell pt-24 md:pt-28">
          <div className="container">
            <div className="rounded-feature border border-state-error/20 bg-state-error/10 p-10 text-center">
              <h1 className="text-2xl font-bold text-brand-deep">Không tìm thấy tài liệu</h1>
              <p className="mt-3 text-text-muted">
                {errorMessage || 'Tài liệu đã bị gỡ hoặc chưa được đồng bộ từ nguồn chính thức.'}
              </p>
              <Link to="/library" className="btn-primary mt-6 inline-flex">
                Quay lại kho tài liệu
              </Link>
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="page-shell pt-24 md:pt-28">
        <div className="container">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <Link to="/library" className="font-semibold text-brand-secondary hover:underline">
              Kho tài liệu
            </Link>
            <span>/</span>
            <span>{documentDetail.title}</span>
          </div>

          <section className="rounded-feature border border-border-base/40 bg-surface-card p-8 shadow-card md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <span className="inline-flex rounded-full bg-brand-secondary/12 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-secondary">
                  {documentDetail.eyebrow || documentDetail.sourceName}
                </span>
                <h1 className="mt-5 text-[2.4rem] font-black leading-tight text-brand-deep md:text-[3rem]">
                  {documentDetail.title}
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-relaxed text-text-muted">
                  {documentDetail.summary}
                </p>
              </div>

              <div className="w-full rounded-[22px] bg-brand-primary p-6 text-text-inverse shadow-card lg:max-w-[360px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Thông tin nguồn
                </p>
                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <p className="text-white/60">Số hiệu</p>
                    <p className="mt-1 text-base font-bold">{documentDetail.documentNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Cơ quan / nguồn</p>
                    <p className="mt-1 text-base font-bold">{documentDetail.issuedBy || documentDetail.sourceName}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Ngày cập nhật / ban hành</p>
                    <p className="mt-1 font-semibold">
                      {documentDetail.issuedDateLabel || documentDetail.updatedAtLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60">Hiệu lực / phạm vi áp dụng</p>
                    <p className="mt-1 font-semibold">
                      {documentDetail.effectiveDateLabel || 'Nguồn tra cứu hiện hành'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={documentDetail.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Xem nguồn chính thức
              </a>
              {documentDetail.downloadUrl ? (
                <a
                  href={documentDetail.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  {documentDetail.downloadLabel || 'Tải bản gốc'}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => navigate(supportPath)}
                className="inline-flex items-center gap-2 rounded-xl bg-surface-subtle px-5 py-3 text-sm font-bold text-brand-deep transition hover:bg-surface-card-alt"
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                Hỏi AI về tài liệu này
              </button>
            </div>
          </section>

          <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-8">
              <div className="rounded-feature border border-border-base/40 bg-surface-card p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-brand-deep">Điểm chính cần lưu ý</h2>
                <div className="mt-6 space-y-4">
                  {documentDetail.highlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-brand-primary/10 bg-surface-subtle p-5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined mt-0.5 text-brand-secondary">
                          task_alt
                        </span>
                        <p className="leading-relaxed text-text-base">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-feature border border-border-base/40 bg-surface-card p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-brand-deep">Lộ trình áp dụng</h2>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">
                      Chuỗi bước nên đọc và thao tác theo đúng thứ tự để dùng tài liệu này hiệu quả.
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                    {documentDetail.roadmap.length} bước
                  </span>
                </div>

                <div className="mt-8 space-y-4">
                  {documentDetail.roadmap.map((item) => (
                    <div
                      key={`${documentDetail.slug}-${item.step}`}
                      className="rounded-2xl border border-border-base/50 bg-surface-subtle p-5"
                    >
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-primary text-lg font-black text-text-inverse">
                          {item.step}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-brand-deep">{item.title}</h3>
                          <p className="mt-2 leading-relaxed text-text-muted">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <div className="rounded-feature border border-border-base/40 bg-surface-card p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-primary/60">
                  Liên kết chính thức
                </h2>
                <div className="mt-5 space-y-3">
                  {documentDetail.officialLinks.map((link) => (
                    <a
                      key={`${link.kind}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-border-base/50 bg-surface-subtle p-4 transition hover:border-brand-primary/30 hover:bg-surface-card-alt"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-brand-deep">{link.label}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                            {link.kind === 'download'
                              ? 'Tải bản gốc'
                              : link.kind === 'source'
                                ? 'Nguồn chính'
                                : 'Tham chiếu'}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-brand-secondary">
                          open_in_new
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-feature border border-border-base/40 bg-surface-card p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-primary/60">
                  Hành động nhanh
                </h2>
                <div className="mt-5 space-y-3">
                  <Link to="/library" className="btn-outline w-full justify-center">
                    Quay lại danh mục
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigate(supportPath)}
                    className="btn-primary w-full justify-center"
                  >
                    Hỏi AI theo ngữ cảnh này
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
