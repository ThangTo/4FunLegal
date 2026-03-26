import { SiteLayout } from "../components/SiteLayout";

const checklistItems = [
  {
    title: "Giấy tờ tùy thân",
    description:
      "Bản gốc hoặc bản sao công chứng CCCD/CMND còn hiệu lực của chủ hộ và các thành viên hộ gia đình nếu có.",
  },
  {
    title: "Thông tin Hộ kinh doanh",
    description:
      "Dự kiến tên hộ kinh doanh, số vốn điều lệ, ngành nghề và mô tả dịch vụ hoặc mặt hàng kinh doanh.",
  },
  {
    title: "Địa điểm kinh doanh",
    description:
      "Địa chỉ chính xác, giấy tờ chứng minh quyền sử dụng hoặc hợp đồng thuê địa điểm nếu cần.",
  },
  {
    title: "Tài liệu số hóa",
    description:
      "Ảnh chụp hoặc bản scan rõ nét của tất cả giấy tờ kể trên ở định dạng tệp được hỗ trợ.",
  },
];

const requirements = [
  "Dung lượng mỗi tệp không quá 10MB.",
  "Hình ảnh phải rõ nét, không bị lóa sáng hoặc mất góc.",
  "Văn bản phải đọc được đầy đủ chữ, số và thông tin quan trọng.",
];

const commonErrors = [
  {
    title: "Hình ảnh bị mờ / nhòe",
    description:
      "Hệ thống không thể nhận diện ký tự OCR nếu văn bản không đủ sắc nét.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBxJpUkza8tCLJpgixPnopwP5y2wCq-uGahb2H-FFyLc1v8Ym1cryfLhzRyiLoTlPU3ZyMYbZMlGeHYd8tMqwC8r2FO_x47APP1yyZ6vJxJ8TgG6shu7oZtO1z3Er5CWceuiVG0gp2YtpLz_82MpTdpNaYahzovCLQ0TYj7gadhSRDN0eFPieoALZ5em5V4mOo7hHcCvD-cbGzrjBS5T4nU8n2w9aMnkWTagK_pIz9TkJtcKb1nmUZYQ2TfkbxUh6dKK9YwhZFLLK2V",
  },
  {
    title: "Giấy tờ hết hạn",
    description:
      "CCCD/CMND cần còn thời hạn sử dụng hợp lệ tại thời điểm nộp hồ sơ.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAKHhoT2fFBNPr_fJ4u44OMFMRy94Y2mm6_cJaJxWWajfR0qxpeNdqy0wgi5OhVrOFC-wRw0MzJ4miHOdfWK81BNwXLWIsUWcrv86xXi-g-hRlHLlSqctai92TcgLRUKC4kc3I0lqx-dcKhIQ4OPFqX_C5r7oZ4WzYFiFVnD57NQYk8CZhASFbnut8FtvcSnVWqrUH4WGU2erPEOvhXAq__CAfwoI3jZHYuqo48po7yUweqJ4d8sd-Le-kBAGwZOsI6TdqR0_XPxPiN",
  },
];

const processSteps = [
  {
    step: "1",
    title: "Chuẩn bị",
    description: "Sắp xếp đủ các đầu mục giấy tờ đã được hướng dẫn.",
    active: true,
  },
  {
    step: "2",
    title: "Nhập liệu",
    description: "Điền các thông tin cơ bản về hộ kinh doanh.",
  },
  {
    step: "3",
    title: "Tải hồ sơ",
    description: "Tải ảnh hoặc bản scan tài liệu đã chuẩn bị lên hệ thống.",
  },
  {
    step: "4",
    title: "Nhận kết quả",
    description: "Nhận thông báo duyệt hoặc yêu cầu chỉnh sửa.",
  },
];

type GuidePageProps = {
  onNavigate: (path: string) => void;
};

export const GuidePage = ({ onNavigate }: GuidePageProps) => {
  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-16">
            <h1 className="max-w-4xl text-[3rem] font-black leading-[1.05] tracking-tight text-brand-deep md:text-[3.5rem]">
              Hướng dẫn chuẩn bị hồ sơ
            </h1>
            <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <p className="max-w-2xl text-lg leading-relaxed text-text-muted">
                Việc chuẩn bị đầy đủ và chính xác các giấy tờ cần thiết giúp quá
                trình đăng ký Hộ kinh doanh diễn ra nhanh chóng, giảm thiểu tối
                đa các sai sót không đáng có.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("/register")}
                className="btn-primary h-14 whitespace-nowrap px-10 text-lg shadow-panel"
              >
                Bắt đầu nhập thông tin
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-12 lg:col-span-8">
            <section className="card-soft rounded-feature p-8 md:p-10">
              <h2 className="mb-8 text-[2rem] font-bold text-text-base">
                Danh mục chuẩn bị
              </h2>
              <div className="grid gap-6">
                {checklistItems.map((item) => (
                  <label
                    key={item.title}
                    className="card-base flex cursor-pointer items-start gap-5 rounded-panel p-6 transition hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-6 w-6 rounded border-border-strong accent-brand-secondary focus:ring-2 focus:ring-ring-focus/20"
                    />
                    <div>
                      <h3 className="mb-1 text-xl font-bold text-text-base">
                        {item.title}
                      </h3>
                      <p className="leading-relaxed text-text-muted">
                        {item.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section id="tai-lieu">
              <h2 className="mb-8 text-[2rem] font-bold text-text-base">
                Yêu cầu về tài liệu
              </h2>
              <div className="card-soft rounded-feature p-8 md:p-10">
                <div className="flex flex-col gap-10 md:flex-row md:items-center">
                  <div className="flex gap-4">
                    {[
                      ["picture_as_pdf", "PDF", "text-state-error"],
                      ["description", "DOCX", "text-brand-primary"],
                      ["image", "JPG", "text-brand-secondary"],
                    ].map(([icon, label, tone]) => (
                      <div
                        key={label}
                        className="flex h-20 w-16 flex-col items-center justify-center rounded-xl border-2 border-border-base bg-surface-card shadow-sm"
                      >
                        <span
                          className={`material-symbols-outlined text-3xl ${tone}`}
                        >
                          {icon}
                        </span>
                        <span className="mt-1 text-[10px] font-bold text-text-muted">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 space-y-4">
                    {requirements.map((requirement) => (
                      <div
                        key={requirement}
                        className="flex items-start gap-3 text-text-muted"
                      >
                        <span className="material-symbols-outlined mt-0.5 text-brand-secondary">
                          check_circle
                        </span>
                        <p className="font-medium leading-relaxed">{requirement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-8 text-[2rem] font-bold text-text-base">
                Lưu ý các lỗi thường gặp
              </h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {commonErrors.map((item) => (
                  <article
                    key={item.title}
                    className="card-soft overflow-hidden rounded-feature"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        alt={item.title}
                        className="h-full w-full object-cover grayscale opacity-50"
                        src={item.image}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-state-error/15 text-state-error shadow-card">
                          <span className="material-symbols-outlined text-4xl">
                            close
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="mb-2 text-lg font-bold text-text-base">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-text-muted">
                        {item.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

            <aside id="ho-tro" className="space-y-12 lg:col-span-4">
            <div className="glass-panel rounded-feature border border-border-base/30 p-8 text-center shadow-panel">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-secondary/16 text-brand-secondary">
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  graphic_eq
                </span>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-text-base">
                Trợ lý giọng nói
              </h3>
              <p className="mb-8 leading-relaxed text-text-muted">
                Dành cho người cao tuổi hoặc người cần hướng dẫn chi tiết qua âm
                thanh.
              </p>
              <button type="button" className="btn-secondary h-14 w-full gap-3">
                <span className="material-symbols-outlined">play_circle</span>
                Nghe hướng dẫn
              </button>
            </div>

            <div className="card-soft rounded-feature p-8">
              <h3 className="mb-8 text-xl font-bold text-text-base">
                Quy trình thực hiện
              </h3>
              <div className="relative space-y-8">
                <div className="absolute left-5 top-5 bottom-5 w-px bg-border-base/40" />
                {processSteps.map((item) => (
                  <div key={item.step} className="relative z-10 flex gap-6">
                    <div
                      className={
                        item.active
                          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/18 text-base font-bold text-brand-primary shadow-sm"
                          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border-base bg-surface-card text-base font-bold text-text-muted"
                      }
                    >
                      {item.step}
                    </div>
                    <div>
                      <h4
                        className={
                          item.active
                            ? "font-bold text-text-base"
                            : "font-bold text-text-muted"
                        }
                      >
                        {item.title}
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-feature bg-brand-primary p-8 text-text-inverse shadow-panel">
              <h3 className="text-xl font-bold">Hỗ trợ trực tiếp</h3>
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-brand-secondary">
                    call
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-text-inverse/60">
                      Tổng đài Hotline
                    </p>
                    <p className="text-lg font-bold">1900 6789</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-brand-secondary">
                    mail
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-text-inverse/60">
                      Email hỗ trợ
                    </p>
                    <p className="font-bold">support@civictech.vn</p>
                  </div>
                </div>
              </div>

              <hr className="my-6 border-text-inverse/15" />

              <a
                href="#"
                className="flex items-center justify-between font-medium transition hover:text-brand-secondary"
              >
                <span>Câu hỏi thường gặp</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};
