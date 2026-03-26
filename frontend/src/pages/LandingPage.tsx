import { SiteLayout } from "../components/SiteLayout";
import { StatusBadge } from "../components/StatusBadge";

const stats = [
  { value: "2.5M+", label: "Hộ kinh doanh đã dùng" },
  { value: "15 Phút", label: "Thời gian hoàn tất trung bình" },
  { value: "85%", label: "Giảm tỷ lệ sai sót hồ sơ" },
  { value: "24/7", label: "Hỗ trợ kiểm tra trực tuyến" },
];

const steps = [
  {
    step: "1",
    title: "Tải lên hồ sơ",
    description:
      "Chụp ảnh hoặc tải lên tệp tin định dạng PDF/JPG của các giấy tờ liên quan.",
  },
  {
    step: "2",
    title: "Hệ thống phân tích",
    description:
      "Trí tuệ nhân tạo sẽ rà soát các thông tin bắt buộc và tìm ra các lỗi sai sót.",
  },
  {
    step: "3",
    title: "Nhận kết quả",
    description:
      "Tải xuống báo cáo chi tiết và hướng dẫn sửa đổi để hoàn thiện hồ sơ.",
  },
];

const ctaHighlights = [
  "Không cần đăng ký",
  "Báo cáo tức thì",
  "Pháp lý chuẩn xác",
];

type LandingPageProps = {
  onNavigate: (path: string) => void;
};

export const LandingPage = ({ onNavigate }: LandingPageProps) => {
  return (
    <SiteLayout>
      <main id="trang-chu">
        <section className="overflow-hidden bg-hero">
          <div className="section-shell">
            <div className="container grid items-center gap-14 md:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-8">
                <div className="flex flex-wrap gap-3">
                  <StatusBadge tone="info">Hỗ trợ hồ sơ trực tuyến</StatusBadge>
                  <StatusBadge tone="success">
                    Miễn phí kiểm tra sơ bộ
                  </StatusBadge>
                </div>

                <div className="space-y-6">
                  <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight text-brand-deep md:text-7xl">
                    Hỗ trợ Kiểm tra{" "}
                    <span className="text-brand-secondary">Hồ sơ Đăng ký</span>{" "}
                    Kinh doanh
                  </h1>
                  <p className="max-w-2xl text-lg leading-relaxed text-text-muted md:text-2xl">
                    Hệ thống thông minh giúp Hộ kinh doanh cá thể rà soát lỗi hồ
                    sơ pháp lý, đảm bảo tính chính xác và tăng tỷ lệ xét duyệt
                    thành công ngay từ lần đầu.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate("/register")}
                    className="btn-primary px-8 py-4 text-base md:px-10 md:py-5 md:text-lg"
                  >
                    Bắt đầu kiểm tra hồ sơ
                    <span className="material-symbols-outlined text-[20px]">
                      arrow_forward
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate("/guide")}
                    className="btn-outline px-8 py-4 text-base md:px-10 md:py-5 md:text-lg"
                  >
                    Xem video hướng dẫn
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="hero-glow -left-10 -top-10 h-56 w-56 bg-brand-secondary/20 md:-left-14 md:-top-14 md:h-72 md:w-72" />
                <div className="card-base relative rounded-feature p-5 shadow-panel md:p-6">
                  <img
                    alt="Minh họa tài liệu đăng ký hộ kinh doanh"
                    className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD66okD-h7bLXG1Yg1ipbau91zN3ruAyGX5GkAGfPq1MESwLt6QL7Kmq0hHJgV-kYB8UKw-8Qpiu2XicLlp51gjU5_dU1GkY72d_Dw9hpcf-f8Vc0yW8uB9yUCBWBuBXQA0FEtcfyVKsTmtBDHU8OA2Uc6ZLgrpUVQ6SWk65K013vPGJ49w0kjU2fAjTrJvq_eLZMOHIwgwtUgEa6MPOsLODj4W08L7wCiPDQvaGF1NtRBy0_P2VWbOvzAdSpsVKbbVMbVoLPunDX2I"
                  />

                  <div className="glass-panel absolute -bottom-8 left-4 flex items-center gap-4 rounded-panel px-4 py-4 shadow-float md:-left-8 md:px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-secondary text-text-inverse">
                      <span className="material-symbols-outlined text-[22px]">
                        verified
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text-base">
                        Độ chính xác AI
                      </div>
                      <div className="text-2xl font-black text-brand-secondary">
                        99.8%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-8 bg-surface-base">
          <div className="container grid gap-5 px-4 pb-6 sm:px-0 md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="card-soft p-8 text-center">
                <div className="text-4xl font-black tracking-tight text-brand-deep">
                  {item.value}
                </div>
                <div className="mt-2 text-sm font-medium text-text-muted md:text-base">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="tai-sao" className="section-shell bg-surface-base">
          <div className="container">
            <div className="mb-14">
              <h2 className="section-title">Tại sao nên chọn chúng tôi?</h2>
              <p className="section-subtitle">
                Quy trình chuyên nghiệp được thiết kế riêng cho người dân Việt
                Nam.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <article className="card-feature group flex flex-col gap-10 p-8 transition hover:-translate-y-1 hover:shadow-panel md:col-span-8 md:flex-row md:items-center md:p-12">
                <div className="flex-1 space-y-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary text-text-inverse">
                    <span className="material-symbols-outlined text-[30px]">
                      bolt
                    </span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-brand-deep">
                      Tốc độ vượt trội
                    </h3>
                    <p className="text-lg leading-relaxed text-text-muted">
                      Không còn phải chờ đợi hàng giờ tại cơ quan hành chính. Hệ
                      thống tự động phân tích hồ sơ của bạn trong tích tắc.
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <img
                    alt="Minh họa tốc độ xử lý hồ sơ"
                    className="h-52 w-full rounded-[1.5rem] object-cover shadow-card transition duration-300 group-hover:scale-[1.02]"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGuYjXLrc7HU8kSq8IicDrcwwx5MH4ur9vLub-UEf4C9wt-jrjPd0psf4XhCGb_K0IHtp-Zhk_GWIFfKe8wcjXKiXCoDdErWfh8S-DaMBS9jla8z6GLvOtlk6yUrApyIMtR39v0utYpHLcxjY1tro_6bXam7BK49TYbu6J1-MkmKb5mHrUvRr9bojA12fWkMV5g5BDjUHoH3lHbNc8YMQibWbxGksnc--G7tpD9P4xx7mYBbQVwWHsLwkfnW-bhoI68WjVtZjJ_WGm"
                  />
                </div>
              </article>

              <article className="rounded-feature bg-brand-deep p-8 text-text-inverse shadow-panel md:col-span-4 md:p-12">
                <div className="flex h-full flex-col justify-between gap-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-base text-brand-deep">
                    <span className="material-symbols-outlined text-[30px]">
                      fact_check
                    </span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold">Chính xác tuyệt đối</h3>
                    <p className="leading-relaxed text-text-inverse/80">
                      Cập nhật liên tục theo các nghị định và quy định pháp luật
                      mới nhất của Chính phủ.
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-feature bg-brand-secondary/20 p-8 shadow-card md:col-span-4 md:p-12">
                <div className="flex h-full flex-col justify-between gap-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-card text-brand-secondary">
                    <span className="material-symbols-outlined text-[30px]">
                      visibility
                    </span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-brand-secondary">
                      Dễ dàng theo dõi
                    </h3>
                    <p className="leading-relaxed text-brand-secondary/85">
                      Giao diện trực quan, cỡ chữ lớn, hướng dẫn từng bước rõ
                      ràng dành cho mọi lứa tuổi.
                    </p>
                  </div>
                </div>
              </article>

              <article className="card-feature group flex flex-col gap-10 p-8 transition hover:-translate-y-1 hover:shadow-panel md:col-span-8 md:flex-row-reverse md:items-center md:p-12">
                <div className="flex-1 space-y-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-state-warning/15 text-state-warning">
                    <span className="material-symbols-outlined text-[30px]">
                      shield
                    </span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-brand-deep">
                      Bảo mật thông tin
                    </h3>
                    <p className="text-lg leading-relaxed text-text-muted">
                      Mọi tài liệu và thông tin cá nhân của bạn được mã hóa và
                      bảo vệ theo tiêu chuẩn an ninh quốc gia.
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <img
                    alt="Minh họa bảo mật dữ liệu"
                    className="h-52 w-full rounded-[1.5rem] object-cover shadow-card transition duration-300 group-hover:scale-[1.02]"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuARz36yUoKQXAEqa2xtBGRr0DhnPBStQOiyoiTfjj4vQNdvE3SuGFkQnjola2NItd77Yty1j-s2vF6lDk06cZqq1zGgsOgf40lW6PQBqP709WhOsnWhNP5z3kNcukO-kGrvL-ZkrILuf7KxRoDck66n1hDiK7Hz74TnN6f-Z_JKotAERloxA3t_WGb1Lc1cATr2ugGUMdaOkEhh263CmlbJXZJiczPByWHc3g7VYP4EbPJdRpI3aVJjbdZilsrLjYJ_J6Ctv5Q_5qDD"
                  />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="quy-trinh" className="section-shell bg-surface-subtle">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="section-title">Quy trình 3 bước đơn giản</h2>
              <p className="section-subtitle mx-auto">
                Bắt đầu ngay hôm nay để sở hữu giấy phép kinh doanh hợp lệ.
              </p>
            </div>

            <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-12">
              <div className="absolute left-1/4 right-1/4 top-10 hidden h-px bg-brand-primary/20 md:block" />
              {steps.map((item, index) => {
                const active = index === 2;

                return (
                  <article
                    key={item.step}
                    className="relative z-10 text-center text-text-base"
                  >
                    <div
                      className={
                        active
                          ? "mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface-card bg-brand-deep text-2xl font-black text-text-inverse shadow-panel"
                          : "mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface-card bg-surface-card text-2xl font-black text-brand-primary shadow-card"
                      }
                    >
                      {item.step}
                    </div>
                    <h3 className="mt-6 text-2xl font-bold text-brand-deep">
                      {item.title}
                    </h3>
                    <p className="mx-auto mt-4 max-w-sm leading-relaxed text-text-muted">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-16 flex justify-center">
              <button
                type="button"
                onClick={() => onNavigate("/register")}
                className="btn-primary rounded-pill px-10 py-5 text-lg shadow-cta"
              >
                Kiểm tra hồ sơ của tôi ngay
              </button>
            </div>
          </div>
        </section>

        <section id="cta" className="section-shell bg-surface-base">
          <div className="container">
            <div className="relative overflow-hidden rounded-feature bg-cta px-8 py-14 text-center shadow-cta md:px-16 md:py-20">
              <div className="absolute inset-y-0 right-[-12%] w-1/2 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-deep/20 to-transparent" />

              <div className="relative z-10 mx-auto max-w-4xl">
                <h2 className="text-4xl font-black leading-tight tracking-tight text-text-inverse md:text-6xl">
                  Đừng để lỗi nhỏ làm gián đoạn kế hoạch kinh doanh của bạn
                </h2>
                <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-text-inverse/80 md:text-xl">
                  Chúng tôi ở đây để đồng hành cùng bạn trên con đường khởi
                  nghiệp. Mọi thứ đều hoàn toàn miễn phí và bảo mật.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 text-sm font-medium text-text-inverse/80 md:flex-row md:gap-8">
                  {ctaHighlights.map((highlight) => (
                    <div key={highlight} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-brand-secondary">
                        check_circle
                      </span>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
};
