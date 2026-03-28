import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { isLoading, user } = useAuth();
  const currentPath = `${location.pathname}${location.search}`;

  if (isLoading) {
    return (
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <div className="card-soft rounded-feature p-10 text-center text-text-muted">
            Đang kiểm tra phiên đăng nhập...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        replace
        to={`/auth/login?redirect=${encodeURIComponent(currentPath)}`}
      />
    );
  }

  if (!user.profileCompleted) {
    return (
      <Navigate
        replace
        to={`/auth/complete-profile?redirect=${encodeURIComponent(currentPath)}`}
      />
    );
  }

  return <>{children}</>;
};
