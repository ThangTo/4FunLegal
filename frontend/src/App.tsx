import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { RegistrationStep, initialProcedureDraft } from './features/procedure/procedureDraft';
import { AssistantPage } from './pages/AssistantPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { GuidePage } from './pages/GuidePage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { LibraryPage } from './pages/LibraryPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { ResultsPage } from './pages/ResultsPage';
import { AppTheme, isAppTheme } from './theme/themes';

const STORAGE_KEY = 'ai-agent-theme';
const ROUTE_TITLES = {
  '/': 'AI Agent - Dịch vụ Hộ kinh doanh',
  '/guide': 'Hướng dẫn chuẩn bị hồ sơ | Dịch vụ Hộ kinh doanh',
  '/register': 'Đăng ký hộ kinh doanh | Dịch vụ Hộ kinh doanh',
  '/documents': 'Hoàn thiện hồ sơ tài liệu | Dịch vụ Hộ kinh doanh',
  '/processing': 'Trạng thái xử lý hồ sơ | Dịch vụ Hộ kinh doanh',
  '/results': 'Kết quả kiểm tra hồ sơ | Dịch vụ Hộ kinh doanh',
  '/history': 'Lịch sử hồ sơ | Dịch vụ Hộ kinh doanh',
  '/library': 'Kho tài liệu nghiệp vụ | Dịch vụ Hộ kinh doanh',
  '/assistant': 'Trợ lý AI pháp lý | Dịch vụ Hộ kinh doanh',
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

const normalizeRoute = (path: string): AppRoute =>
  path === '/guide'
    ? '/guide'
    : path === '/register'
      ? '/register'
      : path === '/documents'
        ? '/documents'
        : path === '/processing'
          ? '/processing'
          : path === '/results'
            ? '/results'
            : path === '/history'
              ? '/history'
              : path === '/library'
                ? '/library'
                : path === '/assistant'
                  ? '/assistant'
                  : '/';

const App = () => {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [procedureDraft, setProcedureDraft] = useState(initialProcedureDraft);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(1);

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
  }, [location.pathname]);

  const navigate = (path: string) => {
    const nextRoute = normalizeRoute(path);

    if (nextRoute === route) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    routerNavigate(nextRoute);
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-base">
      <Routes>
        <Route path="/" element={<LandingPage onNavigate={navigate} />} />
        <Route path="/guide" element={<GuidePage onNavigate={navigate} />} />
        <Route
          path="/register"
          element={
            <RegistrationPage
              draft={procedureDraft}
              currentStep={registrationStep}
              onDraftChange={setProcedureDraft}
              onStepChange={setRegistrationStep}
              onNavigate={navigate}
            />
          }
        />
        <Route
          path="/documents"
          element={<DocumentsPage draft={procedureDraft} onNavigate={navigate} />}
        />
        <Route
          path="/processing"
          element={<ProcessingPage draft={procedureDraft} onNavigate={navigate} />}
        />
        <Route
          path="/results"
          element={
            <ResultsPage
              draft={procedureDraft}
              onNavigate={navigate}
              onStepChange={setRegistrationStep}
            />
          }
        />
        <Route path="/history" element={<HistoryPage onNavigate={navigate} />} />
        <Route
          path="/library"
          element={<LibraryPage draft={procedureDraft} onNavigate={navigate} />}
        />
        <Route
          path="/assistant"
          element={
            <AssistantPage
              draft={procedureDraft}
              onNavigate={navigate}
              onStepChange={setRegistrationStep}
            />
          }
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </div>
  );
};

export default App;
