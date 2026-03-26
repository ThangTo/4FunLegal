import { useEffect, useMemo, useState } from 'react';

import { cn } from '../lib/cn';
import { ProcedureDraft } from '../features/procedure/procedureDraft';
import { SiteLayout } from '../components/SiteLayout';

type LibraryPageProps = {
  draft: ProcedureDraft;
  onNavigate: (path: string) => void;
};

type LibraryCategory = 'procedure' | 'forms' | 'terms' | 'faq' | 'industry';

type LibraryDocument = {
  id: string;
  title: string;
  summary: string;
  category: LibraryCategory;
  updatedAt: string;
  tag: string;
  accent: 'primary' | 'secondary' | 'warning';
  featured?: 'hero' | 'side';
  eyebrow?: string;
};

const categoryTabs: Array<{ id: LibraryCategory; label: string }> = [
  { id: 'procedure', label: 'Hướng dẫn thủ tục' },
  { id: 'forms', label: 'Mẫu biểu' },
  { id: 'terms', label: 'Giải thích thuật ngữ' },
  { id: 'faq', label: 'Câu hỏi thường gặp' },
  { id: 'industry', label: 'Ngành nghề kinh doanh' },
];

const libraryDocuments: LibraryDocument[] = [
  {
    id: 'procedure-household-online',
    title: 'Lộ trình 5 bước đăng ký hộ kinh doanh cá thể năm 2024',
    summary:
      'Cập nhật những thay đổi mới nhất về thông tư quản lý và các ưu đãi thuế cho hộ kinh doanh mới thành lập.',
    category: 'procedure',
    updatedAt: '03/2024',
    tag: 'Mới',
    accent: 'secondary',
    featured: 'hero',
    eyebrow: 'Mới nhất',
  },
  {
    id: 'capital-regulation',
    title: 'Quy định về vốn điều lệ và vốn pháp định',
    summary: 'Giải mã những con số quan trọng khi bắt đầu thành lập doanh nghiệp.',
    category: 'terms',
    updatedAt: '15/12/2023',
    tag: 'Giải thích',
    accent: 'secondary',
    featured: 'side',
  },
  {
    id: 'tnhh-forms',
    title: 'Bộ mẫu biểu chuẩn cho công ty TNHH',
    summary: 'Tải xuống bộ 12 văn bản pháp lý cần thiết được chuyên gia biên soạn.',
    category: 'forms',
    updatedAt: '02/11/2023',
    tag: 'Mẫu biểu',
    accent: 'primary',
    featured: 'side',
  },
  {
    id: 'procedure-guide-online',
    title: 'Hướng dẫn đăng ký hộ kinh doanh cá thể qua mạng',
    summary:
      'Chi tiết các bước thao tác trên cổng thông tin quốc gia, các lỗi thường gặp khi nộp hồ sơ online và cách khắc phục nhanh chóng cho người mới bắt đầu.',
    category: 'procedure',
    updatedAt: '12/2023',
    tag: 'Mới',
    accent: 'secondary',
  },
  {
    id: 'conditional-industries',
    title: 'Danh mục ngành nghề kinh doanh có điều kiện',
    summary:
      'Tra cứu danh sách các ngành nghề yêu cầu vốn pháp định, chứng chỉ hành nghề hoặc giấy phép con trước khi đi vào hoạt động chính thức.',
    category: 'industry',
    updatedAt: '10/2023',
    tag: 'Quan trọng',
    accent: 'warning',
  },
  {
    id: 'single-member-charter',
    title: 'Mẫu điều lệ công ty TNHH một thành viên',
    summary:
      'Bản thảo điều lệ đầy đủ, tuân thủ Luật Doanh nghiệp 2020, cho phép tùy chỉnh các điều khoản về quản trị và phân chia lợi nhuận.',
    category: 'forms',
    updatedAt: '09/2023',
    tag: 'Mẫu biểu',
    accent: 'primary',
  },
  {
    id: 'faq-authorization',
    title: 'Những trường hợp cần văn bản ủy quyền khi nộp hồ sơ',
    summary:
      'Tổng hợp các tình huống phổ biến khi chủ hộ không trực tiếp nộp hồ sơ và các loại giấy tờ thay thế thường bị nhầm lẫn.',
    category: 'faq',
    updatedAt: '01/2024',
    tag: 'FAQ',
    accent: 'secondary',
  },
  {
    id: 'industry-food-retail',
    title: 'Mã ngành gợi ý cho cửa hàng thực phẩm và bán lẻ tiêu dùng',
    summary:
      'Gợi ý nhóm ngành phù hợp với hộ kinh doanh bán lẻ thực phẩm, đồ khô, hàng tiêu dùng nhanh và kênh bán hàng online.',
    category: 'industry',
    updatedAt: '02/2024',
    tag: 'Gợi ý',
    accent: 'secondary',
  },
  {
    id: 'procedure-name-rules',
    title: 'Cách đặt tên hộ kinh doanh để hạn chế bị yêu cầu sửa đổi',
    summary:
      'Các nguyên tắc nên tránh khi đặt tên hộ kinh doanh và mẹo bổ sung yếu tố phân biệt ngay từ lần kê khai đầu tiên.',
    category: 'procedure',
    updatedAt: '03/2024',
    tag: 'Cẩm nang',
    accent: 'warning',
  },
];

const initialVisibleCount = 3;

export const LibraryPage = ({ draft, onNavigate }: LibraryPageProps) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('procedure');
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [query, activeCategory]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return libraryDocuments.filter((document) => {
      const matchesCategory = document.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        document.title.toLowerCase().includes(normalizedQuery) ||
        document.summary.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  const heroDocument = libraryDocuments.find((item) => item.featured === 'hero');
  const sideDocuments = libraryDocuments.filter((item) => item.featured === 'side').slice(0, 2);

  const visibleDocuments = filteredDocuments
    .filter((item) => !item.featured)
    .slice(0, visibleCount);
  const hasMore = visibleCount < filteredDocuments.filter((item) => !item.featured).length;

  const relatedResources = useMemo(
    () => [
      {
        id: 'related-name',
        title: 'Cách đặt tên doanh nghiệp không bị trùng',
        description: 'Tránh bị từ chối hồ sơ vì tên gây nhầm lẫn lần đầu.',
        border: 'border-brand-primary',
      },
      {
        id: 'related-authorization',
        title: 'Hồ sơ ủy quyền cho người đại diện',
        description: 'Mẫu văn bản ủy quyền hợp lệ theo quy định hiện hành.',
        border: 'border-brand-secondary',
      },
      {
        id: 'related-industry',
        title: 'Thủ tục đăng ký con dấu pháp nhân',
        description: `Sau khi có giấy chứng nhận đăng ký kinh doanh cho "${draft.businessName}".`,
        border: 'border-state-warning',
      },
    ],
    [draft.businessName],
  );

  const handleSearch = () => {
    setQuery((value) => value.trim());
  };

  const handleSubscribe = () => {
    if (!email.trim()) {
      return;
    }

    setSubscribed(true);
  };

  return (
    <SiteLayout>
      <main className="page-shell pt-24 md:pt-28">
        <div className="container">
          <section className="mb-16 flex flex-col items-center text-center">
            <h1 className="text-[2.75rem] font-black tracking-tight text-brand-deep md:text-[3.25rem]">
              Kho tài liệu nghiệp vụ
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-text-muted">
              Nơi cung cấp đầy đủ các hướng dẫn, mẫu biểu và giải đáp thắc mắc về các thủ tục đăng
              ký kinh doanh tại Việt Nam.
            </p>

            <div className="relative mt-10 w-full max-w-3xl">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
                <span className="material-symbols-outlined text-text-muted">search</span>
              </div>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm kiếm thủ tục, mẫu đơn, ngành nghề..."
                className="h-[72px] w-full rounded-2xl border border-border-base/60 bg-surface-card pl-14 pr-36 text-base text-text-base shadow-sm outline-none transition placeholder:text-text-muted/70 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-deep px-6 text-sm font-bold text-text-inverse shadow-card transition hover:bg-brand-primary"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
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
                <h2 className="text-[2rem] font-bold text-brand-deep">Hướng dẫn nổi bật</h2>
                <button
                  type="button"
                  onClick={() => setVisibleCount(filteredDocuments.length)}
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
                      {heroDocument.eyebrow ?? 'Mới nhất'}
                    </span>
                    <h3 className="max-w-[520px] text-[2.1rem] font-bold leading-tight">
                      {heroDocument.title}
                    </h3>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-inverse/80">
                      {heroDocument.summary}
                    </p>
                    <button
                      type="button"
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
                      key={document.id}
                      className={cn(
                        'flex h-full flex-col justify-between rounded-[14px] border-l-4 bg-surface-subtle p-6',
                        accentBorderClass(document.accent),
                      )}
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span
                            className={cn(
                              'material-symbols-outlined text-[18px]',
                              document.accent === 'secondary'
                                ? 'text-brand-secondary'
                                : 'text-brand-primary',
                            )}
                          >
                            {document.category === 'forms' ? 'description' : 'stylus_note'}
                          </span>
                          <span className="text-[11px] font-medium text-text-muted">
                            Cập nhật: {document.updatedAt}
                          </span>
                        </div>
                        <h4 className="text-[1.85rem] font-bold leading-tight text-brand-deep">
                          {document.title}
                        </h4>
                        <p className="mt-3 text-sm leading-relaxed text-text-muted">
                          {document.summary}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={cn(
                          'mt-6 inline-flex items-center gap-2 text-sm font-bold',
                          document.category === 'forms'
                            ? 'text-brand-primary'
                            : 'text-brand-secondary',
                        )}
                      >
                        {document.category === 'forms' ? 'Tải tài liệu' : 'Tìm hiểu ngay'}
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

              {visibleDocuments.length > 0 ? (
                visibleDocuments.map((document) => (
                  <article
                    key={document.id}
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
                        Cập nhật: {document.updatedAt}
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
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-deep px-6 py-3 text-sm font-bold text-text-inverse shadow-card transition hover:bg-brand-primary"
                      >
                        Xem chi tiết
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate("/assistant")}
                        className="inline-flex items-center gap-2 rounded-xl bg-surface-subtle px-6 py-3 text-sm font-bold text-brand-deep transition hover:bg-surface-card-alt"
                      >
                        Hỏi AI về tài liệu này
                        <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[16px] bg-surface-card p-12 text-center shadow-[0_4px_20px_rgba(13,29,42,0.04)]">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-hero text-brand-primary">
                    <span className="material-symbols-outlined text-3xl">menu_book</span>
                  </div>
                  <h4 className="text-xl font-bold text-brand-deep">Chưa có tài liệu phù hợp</h4>
                  <p className="mt-2 text-text-muted">
                    Hãy thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác để xem thêm tài liệu liên
                    quan.
                  </p>
                </div>
              )}

              {hasMore ? (
                <div className="flex justify-center pt-6">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((value) => value + 3)}
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
                    onClick={() => onNavigate('/documents')}
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
                    Đăng ký nhận thông báo khi có các quy định mới về thuế và đăng ký kinh doanh.
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
                      onClick={handleSubscribe}
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
