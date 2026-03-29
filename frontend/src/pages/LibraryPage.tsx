import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '../lib/cn';
import { SiteLayout } from '../components/SiteLayout';
import { api, LibraryCategory, LibraryDocument, LibraryRelatedResource } from '../lib/api';
import { getSubmissionIdFromSearch, withSubmissionId } from '../lib/procedure';

const initialVisibleCount = 3;

const buildSupportPath = (document: LibraryDocument) => {
  const search = new URLSearchParams();
  search.set('documentTitle', document.title);
  search.set('documentSummary', document.summary);
  search.set('documentSlug', document.slug);
  return `/support?${search.toString()}`;
};

const buildDocumentDetailPath = (document: LibraryDocument) => `/library/${document.slug}`;

export const LibraryPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('procedure');
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: LibraryCategory; label: string }>>([]);
  const [heroDocument, setHeroDocument] = useState<LibraryDocument | null>(null);
  const [sideDocuments, setSideDocuments] = useState<LibraryDocument[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [relatedResources, setRelatedResources] = useState<LibraryRelatedResource[]>([]);

  useEffect(() => {
    const submissionId = getSubmissionIdFromSearch(window.location.search) ?? undefined;

    let cancelled = false;

    const loadStaticBlocks = async () => {
      const [categoryResponse, featuredResponse, relatedResponse] = await Promise.all([
        api.getLibraryCategories(),
        api.getLibraryFeatured(),
        api.getLibraryRelated(submissionId),
      ]);

      if (!cancelled) {
        setCategories(categoryResponse);
        setHeroDocument(featuredResponse.hero);
        setSideDocuments(featuredResponse.side);
        setRelatedResources(relatedResponse);
      }
    };

    void loadStaticBlocks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      const response = await api.getLibraryDocuments({
        category: activeCategory,
        q: query.trim() || undefined,
        page: 1,
        limit: visibleCount,
      });

      if (!cancelled) {
        setDocuments(response.items);
        setHasMore(response.pagination.total > visibleCount);
      }
    };

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, query, visibleCount]);

  const handleSubscribe = async () => {
    if (!email.trim()) {
      return;
    }

    try {
      await api.createLibrarySubscription(email.trim());
      setSubscribed(true);
    } catch {
      setSubscribed(false);
    }
  };

  return (
    <SiteLayout>
      <main className="page-shell pt-24 md:pt-28">
        <div className="container">
          <section className="mb-16 flex flex-col items-center text-center">
            <h1 className="text-[2.75rem] font-black tracking-tight text-brand-deep md:text-[3.25rem]">
              Kho tài liệu nghiệp vụ
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-text-muted">
              Danh mục văn bản và biểu mẫu được lấy từ nguồn chính thức như Cổng Dịch vụ công
              Quốc gia và Cổng Thông tin quốc gia về đăng ký doanh nghiệp, để bạn có thể xem chi
              tiết, theo dõi lộ trình áp dụng và mở bản gốc khi cần tải về.
            </p>

            <div className="relative mt-10 w-full max-w-3xl">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
                <span className="material-symbols-outlined text-text-muted">search</span>
              </div>
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(initialVisibleCount);
                }}
                placeholder="Tìm kiếm thủ tục, mẫu biểu, số hiệu văn bản..."
                className="h-[72px] w-full rounded-2xl border border-border-base/60 bg-surface-card pl-14 pr-36 text-base text-text-base shadow-sm outline-none transition placeholder:text-text-muted/70 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-deep px-6 text-sm font-bold text-text-inverse shadow-card transition hover:bg-brand-primary"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {categories.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tab.id);
                    setVisibleCount(initialVisibleCount);
                  }}
                  className={cn(
                    'rounded-full px-6 py-3 text-sm font-medium transition',
                    activeCategory === tab.id
                      ? 'bg-brand-primary text-text-inverse shadow-[0_8px_18px_rgba(18,59,93,0.18)]'
                      : 'bg-surface-hero text-text-base hover:bg-surface-card-alt',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {heroDocument ? (
            <section className="mb-16">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-[2rem] font-bold text-brand-deep">Tài liệu nổi bật</h2>
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current + 3)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-secondary transition hover:underline"
                >
                  Xem tất cả
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <article className="relative overflow-hidden rounded-[14px] border border-brand-primary/10 md:col-span-2">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#db6b22_0%,#ef8f35_32%,#173756_100%)]" />
                  <div className="absolute inset-0">
                    <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-[#a84c22]/80" />
                    <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-[#8b3a1a]/80" />
                    <div className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[16px] border-[#63304e]/85" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/80 via-brand-deep/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 text-text-inverse">
                    <span className="mb-4 inline-flex rounded-full bg-brand-secondary/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-secondary">
                      {heroDocument.eyebrow ?? 'Nguồn chính thức'}
                    </span>
                    <h3 className="max-w-[520px] text-[2.1rem] font-bold leading-tight">
                      {heroDocument.title}
                    </h3>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-inverse/80">
                      {heroDocument.summary}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(buildDocumentDetailPath(heroDocument))}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-deep transition hover:bg-surface-hero"
                    >
                      Xem lộ trình
                      <span className="material-symbols-outlined text-[18px]">menu_book</span>
                    </button>
                  </div>
                </article>

                <div className="flex flex-col gap-6">
                  {sideDocuments.map((document) => (
                    <article
                      key={document.slug}
                      className={cn(
                        'flex h-full flex-col justify-between rounded-[14px] border-l-4 bg-surface-subtle p-6',
                        accentBorderClass(document.accent),
                      )}
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <span
                            className={cn(
                              'material-symbols-outlined text-[18px]',
                              document.accent === 'secondary'
                                ? 'text-brand-secondary'
                                : 'text-brand-primary',
                            )}
                          >
                            {document.category === 'forms' ? 'description' : 'policy'}
                          </span>
                          <span className="text-[11px] font-medium text-text-muted">
                            {document.updatedAtLabel}
                          </span>
                        </div>
                        <h4 className="text-[1.5rem] font-bold leading-tight text-brand-deep">
                          {document.title}
                        </h4>
                        <p className="mt-3 text-sm leading-relaxed text-text-muted">
                          {document.summary}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(buildDocumentDetailPath(document))}
                        className={cn(
                          'mt-6 inline-flex items-center gap-2 text-sm font-bold',
                          document.category === 'forms'
                            ? 'text-brand-primary'
                            : 'text-brand-secondary',
                        )}
                      >
                        {document.category === 'forms' ? 'Xem mẫu & tải về' : 'Xem chi tiết'}
                        <span className="material-symbols-outlined text-[16px]">
                          {document.category === 'forms' ? 'download' : 'chevron_right'}
                        </span>
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <section className="min-w-0 flex-1 space-y-6">
              <h3 className="text-[2rem] font-bold text-brand-deep">Tài liệu mới cập nhật</h3>

              {documents.map((document) => (
                <article
                  key={document.slug}
                  className="rounded-[16px] bg-surface-card p-8 shadow-[0_4px_20px_rgba(13,29,42,0.04)] transition hover:shadow-[0_10px_30px_rgba(13,29,42,0.08)]"
                >
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-surface-card-alt px-3 py-1 text-[11px] font-bold text-text-muted">
                        {categoryLabel(document.category)}
                      </span>
                      {document.tag ? (
                        <span
                          className={cn(
                            'rounded-md px-3 py-1 text-[11px] font-bold',
                            accentBadgeClass(document.accent),
                          )}
                        >
                          {document.tag}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-sm font-medium text-text-muted">
                      Cập nhật: {document.updatedAtLabel}
                    </span>
                  </div>

                  <h4 className="text-[2rem] font-bold leading-tight text-brand-deep">
                    {document.title}
                  </h4>
                  <p className="mt-4 max-w-4xl leading-relaxed text-text-muted">
                    {document.summary}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => navigate(buildDocumentDetailPath(document))}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-deep px-6 py-3 text-sm font-bold text-text-inverse shadow-card transition hover:bg-brand-primary"
                    >
                      Xem chi tiết
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(buildSupportPath(document))}
                      className="inline-flex items-center gap-2 rounded-xl bg-surface-subtle px-6 py-3 text-sm font-bold text-brand-deep transition hover:bg-surface-card-alt"
                    >
                      Hỏi AI về tài liệu này
                      <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                    </button>
                  </div>
                </article>
              ))}

              {hasMore ? (
                <div className="flex justify-center pt-6">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + 3)}
                    className="inline-flex items-center justify-center rounded-2xl border border-brand-primary px-10 py-4 text-sm font-bold text-brand-primary transition hover:bg-brand-primary hover:text-text-inverse"
                  >
                    Tải thêm tài liệu
                  </button>
                </div>
              ) : null}
            </section>

            <aside className="w-full shrink-0 lg:w-[280px]">
              <div className="space-y-6 lg:sticky lg:top-28">
                <div className="rounded-[18px] bg-surface-subtle p-6">
                  <h5 className="mb-5 flex items-center gap-2 text-lg font-bold text-brand-deep">
                    <span className="material-symbols-outlined text-brand-secondary">topic</span>
                    Liên quan đến hồ sơ của bạn
                  </h5>

                  <div className="space-y-3">
                    {relatedResources.map((resource) => (
                      <button
                        key={resource.id}
                        type="button"
                        className={cn(
                          'block w-full rounded-[12px] border-l-4 bg-surface-card p-4 text-left transition hover:translate-x-1',
                          resource.border,
                        )}
                      >
                        <h6 className="text-sm font-bold text-brand-deep">{resource.title}</h6>
                        <p className="mt-1 text-xs leading-relaxed text-text-muted">
                          {resource.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        withSubmissionId(
                          '/documents',
                          getSubmissionIdFromSearch(window.location.search),
                        ),
                      )
                    }
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-brand-primary/20 bg-transparent px-4 py-3 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/5"
                  >
                    Quay lại hồ sơ nháp
                  </button>
                </div>

                <div className="relative overflow-hidden rounded-[18px] bg-brand-primary p-6 text-text-inverse shadow-panel">
                  <span className="material-symbols-outlined absolute -bottom-5 -right-4 text-[74px] opacity-10">
                    notifications
                  </span>
                  <h5 className="font-bold">Thông báo thay đổi</h5>
                  <p className="mt-2 text-sm leading-relaxed text-text-inverse/80">
                    Đăng ký nhận thông báo khi có biểu mẫu mới, thay đổi thủ tục hoặc văn bản pháp
                    lý mới trên cổng chính thức.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setSubscribed(false);
                      }}
                      placeholder="Email của bạn"
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSubscribe()}
                      className="rounded-lg bg-brand-secondary px-4 py-2 text-xs font-bold text-text-inverse"
                    >
                      Gửi
                    </button>
                  </div>

                  {subscribed ? (
                    <p className="mt-3 text-xs font-medium text-brand-secondary">
                      Đã lưu email nhận thông báo cập nhật.
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};

const categoryLabel = (category: LibraryCategory) => {
  const map: Record<LibraryCategory, string> = {
    procedure: 'Cẩm nang',
    forms: 'Mẫu biểu',
    terms: 'Giải thích thuật ngữ',
    faq: 'Câu hỏi thường gặp',
    industry: 'Pháp lý',
  };

  return map[category];
};

const accentBadgeClass = (accent: LibraryDocument['accent']) => {
  if (accent === 'secondary') {
    return 'bg-brand-secondary/12 text-brand-secondary';
  }

  if (accent === 'warning') {
    return 'bg-state-error/12 text-state-error';
  }

  return 'bg-brand-primary/12 text-brand-primary';
};

const accentBorderClass = (accent: LibraryDocument['accent']) => {
  if (accent === 'secondary') {
    return 'border-brand-secondary';
  }

  if (accent === 'warning') {
    return 'border-state-warning';
  }

  return 'border-brand-primary';
};
