import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AssistantPage } from './pages/AssistantPage';
import { AuthCompleteProfilePage } from './pages/AuthCompleteProfilePage';
import { AuthLoginPage } from './pages/AuthLoginPage';
import { AuthRegisterPage } from './pages/AuthRegisterPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { FinalSubmissionPage } from './pages/FinalSubmissionPage';
import { GuidePage } from './pages/GuidePage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { LibraryDocumentDetailPage } from './pages/LibraryDocumentDetailPage';
import { LibraryPage } from './pages/LibraryPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { ResultsPage } from './pages/ResultsPage';
import { SupportPage } from './pages/SupportPage';
import { AppTheme, isAppTheme } from './theme/themes';

const STORAGE_KEY = 'ai-agent-theme';
const ROUTE_TITLES = {
  '/': 'AI Agent - Dịch vụ Hộ kinh doanh',
  '/guide': 'Hướng dẫn chuẩn bị hồ sơ | Dịch vụ Hộ kinh doanh',
  '/register': 'Đăng ký hộ kinh doanh | Dịch vụ Hộ kinh doanh',
  '/documents': 'Hoàn thiện tài liệu | Dịch vụ Hộ kinh doanh',
  '/processing': 'Trạng thái xử lý hồ sơ | Dịch vụ Hộ kinh doanh',
  '/results': 'Kết quả kiểm tra hồ sơ | Dịch vụ Hộ kinh doanh',
  '/submit': 'Nộp chính thức hồ sơ | Dịch vụ Hộ kinh doanh',
  '/history': 'Lịch sử hồ sơ | Dịch vụ Hộ kinh doanh',
  '/library': 'Kho tài liệu nghiệp vụ | Dịch vụ Hộ kinh doanh',
  '/support': 'Trợ lý pháp lý AI | Dịch vụ Hộ kinh doanh',
  '/assistant': 'Trợ lý hồ sơ AI | Dịch vụ Hộ kinh doanh',
  '/auth/login': 'Đăng nhập | Dịch vụ Hộ kinh doanh',
  '/auth/register': 'Tạo tài khoản | Dịch vụ Hộ kinh doanh',
  '/auth/complete-profile': 'Hoàn tất hồ sơ tài khoản | Dịch vụ Hộ kinh doanh',
} as const;

type AppRoute = keyof typeof ROUTE_TITLES;

const getInitialTheme = (): AppTheme => {
  if (typeof window === 'undefined') {
    return 'citizen';
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);

  if (storedTheme && isAppTheme(storedTheme)) {
    return storedTheme;
  }

  return 'citizen';
};

const normalizeRoute = (path: string): AppRoute => {
  if (path === '/guide') return '/guide';
  if (path === '/register') return '/register';
  if (path === '/documents') return '/documents';
  if (path === '/processing') return '/processing';
  if (path === '/results') return '/results';
  if (path === '/submit') return '/submit';
  if (path === '/history') return '/history';
  if (path === '/library' || path.startsWith('/library/')) return '/library';
  if (path === '/support') return '/support';
  if (path === '/assistant') return '/assistant';
  if (path === '/auth/login') return '/auth/login';
  if (path === '/auth/register') return '/auth/register';
  if (path === '/auth/complete-profile') return '/auth/complete-profile';
  return '/';
};

const App = () => {
  const location = useLocation();
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  const route = normalizeRoute(location.pathname);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = 'light';
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.title = ROUTE_TITLES[route];
  }, [route]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-surface-base text-text-base">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/auth/login" element={<AuthLoginPage />} />
        <Route path="/auth/register" element={<AuthRegisterPage />} />
        <Route path="/auth/complete-profile" element={<AuthCompleteProfilePage />} />
        <Route
          path="/register"
          element={
            <ProtectedRoute>
              <RegistrationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/processing"
          element={
            <ProtectedRoute>
              <ProcessingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute>
              <FinalSubmissionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:slug" element={<LibraryDocumentDetailPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute>
              <AssistantPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </div>
  );
};

export default App;
