import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { SiteLayout } from './SiteLayout';

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  alternateText: string;
  alternateLabel: string;
  alternateTo: string;
  children: ReactNode;
};

const AUTH_HIGHLIGHTS = [
  'Đồng bộ hồ sơ theo tài khoản thật',
  'Lưu phiên an toàn bằng cookie httpOnly',
  'Có thể tiếp tục bằng email hoặc Google',
];

export const AuthPageShell = ({
  title,
  subtitle,
  alternateText,
  alternateLabel,
  alternateTo,
  children,
}: AuthPageShellProps) => (
  <SiteLayout showAssistant={false}>
    <main className="page-shell pt-28 md:pt-32">
      <div className="container grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="card-cta rounded-feature overflow-hidden p-8 md:p-10">
          <div className="max-w-xl">
            <p className="badge-base border-white/20 bg-white/10 text-text-inverse">
              Tài khoản định danh
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-text-inverse/82">
              {subtitle}
            </p>

            <div className="mt-8 space-y-4">
              {AUTH_HIGHLIGHTS.map((highlight) => (
                <div key={highlight} className="flex items-start gap-3 text-text-inverse/88">
                  <span className="material-symbols-outlined text-brand-secondary">
                    verified
                  </span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card-base rounded-feature p-8 shadow-panel md:p-10">
          {children}

          <div className="mt-8 border-t border-border-base/70 pt-6 text-sm text-text-muted">
            {alternateText}{' '}
            <Link to={alternateTo} className="font-bold text-brand-primary hover:text-brand-deep">
              {alternateLabel}
            </Link>
          </div>
        </section>
      </div>
    </main>
  </SiteLayout>
);
