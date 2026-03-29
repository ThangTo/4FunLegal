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
  businessName: 'Demo household business',
  businessModel: 'Household business',
  businessAddress: '123 Test',
  startDate: '2026-05-01',
  businessDescription: 'Retail food at shop and online delivery.',
  householdMembers: '',
  mainIndustry: 'Retail food',
  subIndustry: '',
  expectedCapital: '10000000',
  laborScale: '1 - 2 workers',
  salesChannel: 'At shop and online',
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
  businessName: 'Demo household business',
  finalSubmission: null,
  uploadedFiles: [
    {
      id: 'doc-1',
      label: 'Application form',
      name: 'don.txt',
      type: 'doc' as const,
      semanticStatus: 'mismatch' as const,
      extractionConfidence: 'high' as const,
    },
  ],
  statusBanner: {
    tone: 'success' as const,
    title: 'Eligible',
    description: 'Ready for official submission after grounded review.',
    score: 88,
    scoreLabel: 'Ready',
  },
  summaryItems: [
    {
      id: 'documents-read',
      tone: 'success' as const,
      icon: 'check_circle',
      text: 'Core documents were parsed and compared with the form.',
    },
  ],
  findings: [
    {
      id: 'finding-1',
      severity: 'warning' as const,
      title: 'Business name mismatch detected',
      affectedField: 'Business name',
      extractedValue: 'Demo household business Quan 9',
      submittedValue: 'Demo household business',
      rejectionReason: 'The application file still shows a different business name.',
      suggestion: 'Update the application form so the business name matches the form.',
      target: { route: '/register' as const, step: 2 as const },
      sourceDocuments: [
        {
          documentId: 'doc-1',
          documentLabel: 'Application form',
          documentType: 'application',
          originalName: 'don.txt',
        },
      ],
      comparisons: [
        {
          id: 'cmp-1',
          fieldKey: 'businessName',
          fieldLabel: 'Business name',
          status: 'mismatch' as const,
          submittedValue: 'Demo household business',
          extractedValue: 'Demo household business Quan 9',
          reason: 'The value extracted from the file differs from the declaration form.',
          sourceDocuments: [
            {
              documentId: 'doc-1',
              documentLabel: 'Application form',
              documentType: 'application',
              originalName: 'don.txt',
            },
          ],
          legalBasis: ['Nghi dinh 01/2021/ND-CP'],
        },
      ],
      legalBasis: ['Nghi dinh 01/2021/ND-CP'],
    },
  ],
  missingDocuments: [],
  nextActions: [],
  references: ['Nghi dinh 01/2021/ND-CP'],
  documentChecks: [
    {
      documentId: 'doc-1',
      documentLabel: 'Application form',
      documentType: 'application',
      originalName: 'don.txt',
      status: 'mismatch' as const,
      summary: 'Mismatch between the uploaded application and the declaration form.',
      extractionConfidence: 'high' as const,
      extractedFields: {
        businessName: 'Demo household business Quan 9',
      },
      issues: [
        {
          id: 'issue-1',
          title: 'Business name mismatch detected',
          rejectionReason: 'The extracted business name differs from the form.',
        },
      ],
      legalBasis: ['Nghi dinh 01/2021/ND-CP'],
    },
  ],
  fieldComparisons: [
    {
      id: 'cmp-1',
      fieldKey: 'businessName',
      fieldLabel: 'Business name',
      status: 'mismatch' as const,
      submittedValue: 'Demo household business',
      extractedValue: 'Demo household business Quan 9',
      reason: 'The value extracted from the file differs from the declaration form.',
      sourceDocuments: [
        {
          documentId: 'doc-1',
          documentLabel: 'Application form',
          documentType: 'application',
          originalName: 'don.txt',
        },
      ],
      legalBasis: ['Nghi dinh 01/2021/ND-CP'],
    },
  ],
  legalBasis: ['Nghi dinh 01/2021/ND-CP'],
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
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
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
          name: 'Draft dossier',
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
          name: 'Submitted dossier',
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

    expect(await screen.findByText('Draft dossier')).toBeInTheDocument();
    expect(screen.getByText('Submitted dossier')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /receipt|biên nhận/i }));

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
          label: 'Additional document',
          name: 'scan-1.pdf',
          size: '120 KB',
          format: 'PDF',
          type: 'doc',
          documentType: 'other',
          icon: 'description',
          status: 'processing',
          statusLabel: 'Waiting OCR',
          semanticStatus: 'possible_type_mismatch',
          semanticStatusLabel: 'Possible wrong type',
          extractionConfidence: 'low',
          semanticIssues: [{ id: 'issue-1' }],
        },
      ],
      checklist: [
        {
          id: 'application',
          label: 'Application form',
          status: 'missing_required',
          required: true,
        },
      ],
      summary: {
        ownerName: 'Demo User',
        businessName: 'Demo household business',
        uploadedCount: 1,
        uploadedRequiredCount: 0,
        requiredCount: 1,
        missingRequiredCount: 1,
        canStartReview: false,
        aiHint: 'Need application form',
      },
    });
    mockApi.updateDocumentType.mockResolvedValue({
      uploadedFiles: [
        {
          id: 'doc-1',
          label: 'Application form',
          name: 'scan-1.pdf',
          size: '120 KB',
          format: 'PDF',
          type: 'doc',
          documentType: 'application',
          icon: 'description',
          status: 'processing',
          statusLabel: 'Waiting OCR',
          semanticStatus: 'pending',
          semanticStatusLabel: 'Pending semantic review',
          extractionConfidence: null,
          semanticIssues: [],
        },
      ],
      checklist: [
        {
          id: 'application',
          label: 'Application form',
          status: 'uploaded',
          required: true,
        },
      ],
      summary: {
        ownerName: 'Demo User',
        businessName: 'Demo household business',
        uploadedCount: 1,
        uploadedRequiredCount: 1,
        requiredCount: 1,
        missingRequiredCount: 0,
        canStartReview: true,
        aiHint: 'Ready for review',
      },
    });

    renderWithAuth(
      '/documents?submissionId=sub-1',
      <Routes>
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/processing" element={<div>Processing target</div>} />
      </Routes>,
    );

    expect(await screen.findByText('Possible wrong type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /phân tích|phan tich/i })).toBeDisabled();

    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'application');

    await waitFor(() => {
      expect(mockApi.updateDocumentType).toHaveBeenCalledWith('sub-1', 'doc-1', 'application');
    });
  });

  it('renders grounded result evidence and routes eligible dossiers to the official submission screen', async () => {
    mockApi.getReviewResult.mockResolvedValue(eligibleResult);

    renderWithAuth(
      '/results?submissionId=sub-1',
      <Routes>
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/submit" element={<LocationDisplay />} />
      </Routes>,
    );

    expect((await screen.findAllByText('Business name mismatch detected')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Application form').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Demo household business Quan 9').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nghi dinh 01/2021/ND-CP').length).toBeGreaterThan(0);
    expect(screen.getByText('Mismatch between the uploaded application and the declaration form.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /submit|nộp/i }));

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
          label: 'Citizen ID',
          name: 'cccd.pdf',
          size: '120 KB',
          format: 'PDF',
          type: 'doc',
          documentType: 'citizen-id',
          icon: 'description',
          status: 'verified',
          statusLabel: 'Verified',
          semanticStatus: 'matched',
          semanticStatusLabel: 'Matched',
          extractionConfidence: 'high',
          semanticIssues: [],
        },
      ],
      checklist: [],
      summary: {
        ownerName: 'Demo User',
        businessName: 'Demo household business',
        uploadedCount: 1,
        uploadedRequiredCount: 1,
        requiredCount: 1,
        missingRequiredCount: 0,
        canStartReview: true,
        aiHint: 'Ready',
      },
    });
    mockApi.submitSubmission.mockResolvedValue(submittedDetail);

    renderWithAuth(
      '/submit?submissionId=sub-1',
      <Routes>
        <Route path="/submit" element={<FinalSubmissionPage />} />
      </Routes>,
    );

    expect(await screen.findByText(/Demo household business/)).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);
    await userEvent.click(screen.getByRole('button', { name: /confirm|xác nhận/i }));

    await waitFor(() => {
      expect(mockApi.submitSubmission).toHaveBeenCalledWith('sub-1');
    });

    expect((await screen.findAllByText(/receipt|biên nhận/i)).length).toBeGreaterThan(0);
    expect(screen.getByText('SUB-HKD-2026-00005-123456')).toBeInTheDocument();
  });
});
