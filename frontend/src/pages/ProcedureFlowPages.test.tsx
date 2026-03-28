import { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    listSubmissions: vi.fn(),
    getSubmission: vi.fn(),
    getDocuments: vi.fn(),
    updateDocumentType: vi.fn(),
    startReview: vi.fn(),
    getReviewResult: vi.fn(),
    submitSubmission: vi.fn(),
  },
}));

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');

  return {
    ...actual,
    api: {
      ...actual.api,
      ...mockApi,
    },
  };
});

import { AuthContext, AuthContextValue } from '../features/auth/AuthContext';
import { DocumentsPage } from './DocumentsPage';
import { FinalSubmissionPage } from './FinalSubmissionPage';
import { HistoryPage } from './HistoryPage';
import { ResultsPage } from './ResultsPage';

const authUser = {
  id: 'user-1',
  fullName: 'Demo User',
  email: 'demo@example.com',
  phone: '0901234567',
  status: 'active',
  role: 'user' as const,
  defaultSubmissionId: 'sub-1',
  avatarUrl: null,
  profileCompleted: true,
  missingProfileFields: [],
};

const authValue: AuthContextValue = {
  user: authUser,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  refreshSession: vi.fn(),
  completeProfile: vi.fn(),
  logout: vi.fn(),
};

const draft = {
  ownerName: 'Demo User',
  nationalId: '012345678901',
  birthDate: '1990-01-01',
  phone: '0901234567',
  email: 'demo@example.com',
  address: '123 Test',
  submittedByProxy: false,
  proxyName: '',
  proxyRelationship: '',
  businessName: 'Hộ kinh doanh Demo Quận 1',
  businessModel: 'Hộ kinh doanh cá thể',
  businessAddress: '123 Test',
  startDate: '2026-05-01',
  businessDescription: 'Bán lẻ thực phẩm tại cửa hàng và giao hàng online.',
  householdMembers: '',
  mainIndustry: 'Bán lẻ thực phẩm',
  subIndustry: '',
  expectedCapital: '10000000',
  laborScale: '1 - 2 lao động',
  salesChannel: 'Tại cửa hàng và online',
  note: '',
  requiresPracticeLicense: false,
};

const submissionDetail = {
  id: 'sub-1',
  submissionCode: 'HKD-2026-00005',
  type: 'household' as const,
  currentStep: 4,
  status: 'documents_pending' as const,
  completionPercent: 100,
  latestReviewId: null,
  draft,
  stepValidity: {
    owner: true,
    business: true,
    industry: true,
  },
  resumeTarget: { route: '/documents' as const },
  isLocked: false,
  finalSubmission: null,
  updatedAt: '2026-03-27T10:00:00.000Z',
  createdAt: '2026-03-27T10:00:00.000Z',
};

const eligibleResult = {
  id: 'review-1',
  submissionId: 'sub-1',
  status: 'completed' as const,
  submissionStatus: 'eligible' as const,
  ownerName: 'Demo User',
  submissionCode: 'HKD-2026-00005',
  businessName: 'Hộ kinh doanh Demo Quận 1',
  finalSubmission: null,
  uploadedFiles: [],
  statusBanner: {
    tone: 'success' as const,
    title: 'Đủ điều kiện sơ bộ',
    description: 'Sẵn sàng cho bước nộp chính thức',
    score: 92,
    scoreLabel: 'Sẵn sàng',
  },
  summaryItems: [],
  findings: [],
  missingDocuments: [],
  nextActions: [],
  references: [],
};

const submittedDetail = {
  ...submissionDetail,
  status: 'submitted' as const,
  resumeTarget: { route: '/submit' as const },
  isLocked: true,
  finalSubmission: {
    submittedAt: '2026-03-27T10:00:00.000Z',
    confirmationNumber: 'SUB-HKD-2026-00005-123456',
    channel: 'internal' as const,
    externalTrackingCode: null,
  },
};

const eligibleSubmissionDetail = {
  ...submissionDetail,
  status: 'eligible' as const,
  resumeTarget: { route: '/results' as const },
};

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
};

const renderWithAuth = (initialEntry: string, children: ReactNode) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        {children}
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('Procedure flow pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('uses resumeTarget to drive history actions including submitted receipts', async () => {
    mockApi.listSubmissions.mockResolvedValue({
      items: [
        {
          id: 'sub-1',
          submissionCode: 'HKD-2026-00001',
          name: 'Hồ sơ đang kê khai',
          createdAt: '2026-03-27T10:00:00.000Z',
          updatedAt: '2026-03-27T10:00:00.000Z',
          status: 'draft',
          issueCount: null,
          type: 'household',
          resumeTarget: { route: '/register', step: 2 },
          finalSubmission: null,
        },
        {
          id: 'sub-2',
          submissionCode: 'HKD-2026-00002',
          name: 'Hồ sơ đã nộp',
          createdAt: '2026-03-27T10:00:00.000Z',
          updatedAt: '2026-03-27T10:00:00.000Z',
          status: 'submitted',
          issueCount: null,
          type: 'household',
          resumeTarget: { route: '/submit' },
          finalSubmission: {
            submittedAt: '2026-03-27T10:00:00.000Z',
            confirmationNumber: 'SUB-HKD-2026-00002-123456',
            channel: 'internal',
            externalTrackingCode: null,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 5,
        total: 2,
        totalPages: 1,
      },
    });

    renderWithAuth(
      '/history',
      <Routes>
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/register" element={<LocationDisplay />} />
        <Route path="/submit" element={<LocationDisplay />} />
      </Routes>,
    );

    expect(await screen.findByText('Hồ sơ đang kê khai')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục kê khai' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem biên nhận' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xem biên nhận' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent(
        '/submit?submissionId=sub-2',
      );
    });
  });

  it('disables review until required documents are complete and allows document reclassification', async () => {
    mockApi.getSubmission.mockResolvedValue(submissionDetail);
    mockApi.getDocuments.mockResolvedValue({
      uploadedFiles: [
        {
          id: 'doc-1',
          label: 'Tài liệu bổ sung',
          name: 'scan-1.pdf',
          size: '120 KB',
          format: 'PDF',
          type: 'doc',
          documentType: 'other',
          icon: 'description',
          status: 'processing',
          statusLabel: 'Chờ OCR',
        },
      ],
      checklist: [
        {
          id: 'application',
          label: 'Đơn đăng ký',
          status: 'missing_required',
          required: true,
        },
      ],
      summary: {
        ownerName: 'Demo User',
        businessName: 'Hộ kinh doanh Demo Quận 1',
        uploadedCount: 1,
        uploadedRequiredCount: 0,
        requiredCount: 1,
        missingRequiredCount: 1,
        canStartReview: false,
        aiHint: 'Cần bổ sung đơn đăng ký',
      },
    });
    mockApi.updateDocumentType.mockResolvedValue({
      uploadedFiles: [
        {
          id: 'doc-1',
          label: 'Đơn đăng ký',
          name: 'scan-1.pdf',
          size: '120 KB',
          format: 'PDF',
          type: 'doc',
          documentType: 'application',
          icon: 'description',
          status: 'processing',
          statusLabel: 'Chờ OCR',
        },
      ],
      checklist: [
        {
          id: 'application',
          label: 'Đơn đăng ký',
          status: 'uploaded',
          required: true,
        },
      ],
      summary: {
        ownerName: 'Demo User',
        businessName: 'Hộ kinh doanh Demo Quận 1',
        uploadedCount: 1,
        uploadedRequiredCount: 1,
        requiredCount: 1,
        missingRequiredCount: 0,
        canStartReview: true,
        aiHint: 'Hồ sơ đã đủ điều kiện',
      },
    });

    renderWithAuth(
      '/documents?submissionId=sub-1',
      <Routes>
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/processing" element={<div>Processing target</div>} />
      </Routes>,
    );

    expect(await screen.findByRole('button', { name: 'Bắt đầu phân tích' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByDisplayValue('Tài liệu bổ sung'), 'application');

    await waitFor(() => {
      expect(mockApi.updateDocumentType).toHaveBeenCalledWith('sub-1', 'doc-1', 'application');
    });
  });

  it('routes eligible results to the official submission screen', async () => {
    mockApi.getReviewResult.mockResolvedValue(eligibleResult);

    renderWithAuth(
      '/results?submissionId=sub-1',
      <Routes>
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/submit" element={<LocationDisplay />} />
      </Routes>,
    );

    expect(await screen.findByText('Sẵn sàng cho bước nộp chính thức')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Nộp chính thức/ }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent(
        '/submit?submissionId=sub-1',
      );
    });
  });

  it('submits the dossier from the final submission page and shows the receipt', async () => {
    mockApi.getSubmission.mockResolvedValue(eligibleSubmissionDetail);
    mockApi.getDocuments.mockResolvedValue({
      uploadedFiles: [
        {
          id: 'doc-1',
          label: 'CCCD',
          name: 'cccd.pdf',
          size: '120 KB',
          format: 'PDF',
          type: 'doc',
          documentType: 'citizen-id',
          icon: 'description',
          status: 'verified',
          statusLabel: 'OCR hoàn tất',
        },
      ],
      checklist: [],
      summary: {
        ownerName: 'Demo User',
        businessName: 'Hộ kinh doanh Demo Quận 1',
        uploadedCount: 1,
        uploadedRequiredCount: 1,
        requiredCount: 1,
        missingRequiredCount: 0,
        canStartReview: true,
        aiHint: 'Sẵn sàng',
      },
    });
    mockApi.submitSubmission.mockResolvedValue(submittedDetail);

    renderWithAuth(
      '/submit?submissionId=sub-1',
      <Routes>
        <Route path="/submit" element={<FinalSubmissionPage />} />
      </Routes>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Tóm tắt hồ sơ cuối cùng' }),
    ).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận nộp chính thức' }));

    await waitFor(() => {
      expect(mockApi.submitSubmission).toHaveBeenCalledWith('sub-1');
    });

    expect(await screen.findByText('Biên nhận nội bộ')).toBeInTheDocument();
    expect(screen.getByText('SUB-HKD-2026-00005-123456')).toBeInTheDocument();
  });
});
