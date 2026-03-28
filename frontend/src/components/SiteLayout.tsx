import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import { VoiceAssistantFab } from './VoiceAssistantFab';

type SiteLayoutProps = {
  children: ReactNode;
  showAssistant?: boolean;
};

type NavKey = 'home' | 'procedure' | 'history' | 'library' | 'guide' | 'support';

const NAV_ITEMS: Array<{ key: NavKey; label: string; to: string }> = [
  { key: 'home', label: 'Trang chủ', to: '/' },
  { key: 'procedure', label: 'Thủ tục', to: '/register' },
  { key: 'history', label: 'Hồ sơ của tôi', to: '/history' },
  { key: 'library', label: 'Tra cứu', to: '/library' },
  { key: 'guide', label: 'Hướng dẫn', to: '/guide' },
  { key: 'support', label: 'Hỗ trợ', to: '/assistant' },
];

const getInitial = (fullName?: string | null) =>
  fullName?.trim().charAt(0).toUpperCase() || 'U';

export const SiteLayout = ({ children, showAssistant = true }: SiteLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, logout, user } = useAuth();

  const isActive = (key: NavKey) => {
    if (key === 'home') {
      return location.pathname === '/';
    }

    if (key === 'procedure') {
      return ['/register', '/documents', '/processing', '/results', '/submit'].includes(
        location.pathname,
      );
    }

    if (key === 'history') {
      return location.pathname.startsWith('/history');
    }

    if (key === 'library') {
      return location.pathname.startsWith('/library');
    }

    if (key === 'guide') {
      return location.pathname.startsWith('/guide');
    }

    return location.pathname.startsWith('/assistant');
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border-base/70 bg-surface-base/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between gap-4 py-4">
          <Link
            to="/"
            className="text-left text-lg font-black tracking-tight text-brand-deep md:text-2xl"
          >
            Dịch vụ Hộ kinh doanh
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={isActive(item.key) ? 'nav-link nav-link-active' : 'nav-link'}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-brand-deep">
            {user ? (
              <>
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-transparent transition hover:bg-brand-primary/10 md:inline-flex"
                  aria-label="Thông báo"
                >
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="hidden items-center gap-3 rounded-2xl border border-border-base/70 bg-surface-card px-3 py-2 transition hover:border-brand-primary/20 hover:bg-surface-subtle md:inline-flex"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-black text-text-inverse">
                      {getInitial(user.fullName)}
                    </span>
                  )}
                  <span className="text-left">
                    <span className="block text-xs uppercase tracking-[0.14em] text-text-muted">
                      {user.role}
                    </span>
                    <span className="block max-w-[12rem] truncate font-bold text-brand-deep">
                      {user.fullName}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void logout().then(() => {
                      navigate('/', { replace: true });
                    })
                  }
                  className="btn-outline hidden h-10 px-4 md:inline-flex"
                >
                  Đăng xuất
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent transition hover:bg-brand-primary/10 md:hidden"
                  aria-label="Tài khoản"
                >
                  <span className="material-symbols-outlined text-[20px]">account_circle</span>
                </button>
              </>
            ) : isLoading ? (
              <div className="hidden rounded-2xl border border-border-base/70 bg-surface-card px-4 py-2 text-sm text-text-muted md:block">
                Đang tải phiên...
              </div>
            ) : (
              <>
                <Link to="/auth/login" className="btn-outline hidden h-10 px-4 md:inline-flex">
                  Đăng nhập
                </Link>
                <Link to="/auth/register" className="btn-primary hidden h-10 px-4 md:inline-flex">
                  Tạo tài khoản
                </Link>
                <Link
                  to="/auth/login"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent transition hover:bg-brand-primary/10 md:hidden"
                  aria-label="Đăng nhập"
                >
                  <span className="material-symbols-outlined text-[20px]">account_circle</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-border-base/70 bg-surface-base">
        <div className="container flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <div className="text-xl font-bold text-brand-deep">Dịch vụ Hộ kinh doanh</div>
            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-text-muted">
              © 2024 Cổng thông tin hộ kinh doanh Việt Nam. Thiết kế theo tiêu chuẩn
              resilient civic-tech.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs uppercase tracking-[0.2em] text-text-muted md:justify-end">
            <a href="#cta" className="transition hover:text-brand-primary">
              Điều khoản
            </a>
            <a href="#cta" className="transition hover:text-brand-primary">
              Bảo mật
            </a>
            <a href="#cta" className="transition hover:text-brand-primary">
              Liên hệ hỗ trợ
            </a>
            <a href="#cta" className="transition hover:text-brand-primary">
              Câu hỏi thường gặp
            </a>
          </div>
        </div>
      </footer>

      {showAssistant ? <VoiceAssistantFab /> : null}
    </>
  );
};
