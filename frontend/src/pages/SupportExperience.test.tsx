import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getLegalAssistantSession: vi.fn(),
    createLegalAssistantMessage: vi.fn(),
    getAssistantSession: vi.fn(),
    getLibraryCategories: vi.fn(),
    getLibraryFeatured: vi.fn(),
    getLibraryRelated: vi.fn(),
    getLibraryDocuments: vi.fn(),
    getLibraryDocumentDetail: vi.fn(),
    createLibrarySubscription: vi.fn(),
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
import { SiteLayout } from '../components/SiteLayout';
import { VoiceAssistantFab } from '../components/VoiceAssistantFab';
import { AssistantPage } from './AssistantPage';
import { LibraryPage } from './LibraryPage';
import { SupportPage } from './SupportPage';

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

const publicAuthValue: AuthContextValue = {
  ...authValue,
  user: null,
  isAuthenticated: false,
};

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
};

const readyAvailability = {
  available: true,
  degraded: false,
  serviceMode: 'graph-rag',
  neo4jReady: true,
  chromaReady: true,
  geminiConfigured: true,
  reason: null,
};

describe('Support experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads the support session and sends a legal assistant message with history', async () => {
    mockApi.getLegalAssistantSession.mockResolvedValue({
      welcome: [
        {
          id: 'welcome-1',
          role: 'assistant',
          paragraphs: ['Support ready.'],
          references: ['Law 2020'],
        },
      ],
      suggestedPrompts: ['First prompt'],
      availability: readyAvailability,
    });
    mockApi.createLegalAssistantMessage.mockResolvedValue({
      reply: {
        id: 'reply-1',
        role: 'assistant',
        paragraphs: ['Grounded answer.'],
        references: ['Law 2020'],
        routeType: 'ADVISORY',
        confidenceScore: 0.92,
      },
      suggestedPrompts: ['Follow up'],
      availability: readyAvailability,
    });

    render(
      <AuthContext.Provider value={publicAuthValue}>
        <MemoryRouter initialEntries={['/support']}>
          <Routes>
            <Route path="/support" element={<SupportPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Support ready.')).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText(/Hỏi về quy định pháp lý/i),
      'What is required?{enter}',
    );

    await waitFor(() => {
      expect(mockApi.createLegalAssistantMessage).toHaveBeenCalledWith({
        message: 'What is required?',
        history: [
          {
            role: 'assistant',
            paragraphs: ['Support ready.'],
          },
          {
            role: 'user',
            paragraphs: ['What is required?'],
          },
        ],
        context: undefined,
      });
    });

    expect(await screen.findByText('Grounded answer.')).toBeInTheDocument();
  });

  it('prevents duplicate legal assistant requests when prompt buttons are clicked rapidly', async () => {
    mockApi.getLegalAssistantSession.mockResolvedValue({
      welcome: [
        {
          id: 'welcome-1',
          role: 'assistant',
          paragraphs: ['Support ready.'],
          references: ['Law 2020'],
        },
      ],
      suggestedPrompts: ['First prompt'],
      availability: readyAvailability,
    });
    mockApi.createLegalAssistantMessage.mockImplementation(
      () => new Promise<never>(() => undefined),
    );

    render(
      <AuthContext.Provider value={publicAuthValue}>
        <MemoryRouter initialEntries={['/support']}>
          <Routes>
            <Route path="/support" element={<SupportPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const [promptButton] = await screen.findAllByRole('button', { name: 'First prompt' });

    fireEvent.click(promptButton);
    fireEvent.click(promptButton);

    await waitFor(() => {
      expect(mockApi.createLegalAssistantMessage).toHaveBeenCalledTimes(1);
    });
  });

  it('resolves canonical document context on /support and keeps it across messages', async () => {
    mockApi.getLegalAssistantSession.mockResolvedValue({
      welcome: [
        {
          id: 'welcome-1',
          role: 'assistant',
          paragraphs: ['Support ready.'],
          references: ['Law 2020'],
        },
      ],
      suggestedPrompts: ['Ask about this document'],
      availability: readyAvailability,
    });
    mockApi.getLibraryDocumentDetail.mockResolvedValue({
      slug: 'dang-ky-thanh-lap-ho-kinh-doanh',
      title: 'Official household registration guide',
      summary: 'Official steps and required forms.',
      category: 'procedure',
      updatedAtLabel: 'Today',
      tag: 'Official',
      accent: 'secondary',
      featured: 'hero',
      eyebrow: 'Portal',
      actionKind: 'learn',
      sourceName: 'National Public Service Portal',
      sourceUrl: 'https://example.com/source',
      downloadUrl: 'https://example.com/download',
      downloadLabel: 'Download',
      documentNumber: '1.001612',
      issuedBy: 'Portal',
      issuedDateLabel: 'Today',
      effectiveDateLabel: 'Now',
      highlights: ['Need ID copy', 'Need application form'],
      roadmap: [
        {
          step: 1,
          title: 'Prepare',
          description: 'Prepare the dossier',
        },
      ],
      officialLinks: [
        {
          label: 'Open source',
          url: 'https://example.com/source',
          kind: 'source',
        },
      ],
    });
    mockApi.createLegalAssistantMessage.mockResolvedValue({
      reply: {
        id: 'reply-1',
        role: 'assistant',
        paragraphs: ['Document-grounded answer.'],
        references: ['Law 2020'],
        routeType: 'ADVISORY',
        confidenceScore: 0.93,
      },
      suggestedPrompts: ['Ask follow-up'],
      availability: readyAvailability,
    });

    render(
      <AuthContext.Provider value={publicAuthValue}>
        <MemoryRouter
          initialEntries={['/support?documentSlug=dang-ky-thanh-lap-ho-kinh-doanh']}
        >
          <Routes>
            <Route path="/support" element={<SupportPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Official household registration guide')).toBeInTheDocument();
    expect(screen.getByText('Need ID copy')).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText(/Hỏi về quy định pháp lý/i),
      'Can you summarise this document?{enter}',
    );

    await waitFor(() => {
      expect(mockApi.createLegalAssistantMessage).toHaveBeenCalledWith({
        message: 'Can you summarise this document?',
        history: [
          {
            role: 'assistant',
            paragraphs: ['Support ready.'],
          },
          {
            role: 'user',
            paragraphs: ['Can you summarise this document?'],
          },
        ],
        context: {
          documentSlug: 'dang-ky-thanh-lap-ho-kinh-doanh',
          documentTitle: 'Official household registration guide',
          documentSummary: 'Official steps and required forms.',
          sourceName: 'National Public Service Portal',
          sourceUrl: 'https://example.com/source',
          documentNumber: '1.001612',
          highlights: ['Need ID copy', 'Need application form'],
          roadmap: [
            {
              step: 1,
              title: 'Prepare',
              description: 'Prepare the dossier',
            },
          ],
          officialLinks: [
            {
              label: 'Open source',
              url: 'https://example.com/source',
              kind: 'source',
            },
          ],
        },
      });
    });
  });

  it('routes the voice assistant fab to /support', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<VoiceAssistantFab />} />
          <Route path="/support" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByLabelText(/AI/i));

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/support');
    });
  });

  it('routes library AI entry points to /support with document context', async () => {
    mockApi.getLibraryCategories.mockResolvedValue([{ id: 'procedure', label: 'Procedure' }]);
    mockApi.getLibraryFeatured.mockResolvedValue({
      hero: null,
      side: [],
    });
    mockApi.getLibraryRelated.mockResolvedValue([]);
    mockApi.getLibraryDocuments.mockResolvedValue({
      items: [
        {
          slug: 'dang-ky-thanh-lap-ho-kinh-doanh',
          title: 'Official household registration guide',
          summary: 'Official steps and required forms.',
          category: 'procedure',
          updatedAtLabel: 'Today',
          tag: 'Official',
          accent: 'primary',
          featured: 'none',
          actionKind: 'learn',
        },
      ],
      pagination: {
        page: 1,
        limit: 3,
        total: 1,
        totalPages: 1,
      },
    });

    render(
      <AuthContext.Provider value={publicAuthValue}>
        <MemoryRouter initialEntries={['/library']}>
          <Routes>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/support" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Official household registration guide')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Hỏi AI về tài liệu này/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/support?');
      expect(screen.getByTestId('location-display')).toHaveTextContent(
        'documentSlug=dang-ky-thanh-lap-ho-kinh-doanh',
      );
    });
  });

  it('keeps dossier assistant bound to the resolved submission id and renders document issues', async () => {
    mockApi.getAssistantSession.mockResolvedValue({
      threadId: 'thread-1',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          paragraphs: ['I am tracking your dossier.'],
          references: ['Law 2020'],
        },
      ],
      suggestedPrompts: ['Which file is wrong?'],
      references: ['Law 2020'],
      context: {
        submission: {
          businessName: 'Demo household business',
          submissionCode: 'HKD-2026-00001',
        },
        errorSummary: {
          count: 1,
          items: [{ id: 'finding-1', title: 'Business name mismatch' }],
        },
        relatedDocuments: [
          {
            id: 'doc-1',
            label: 'Application form',
            name: 'don.txt',
            size: '12 KB',
            format: 'TXT',
            type: 'doc',
            documentType: 'application',
            status: 'verified',
            statusLabel: 'OCR done',
            semanticStatus: 'mismatch',
            semanticStatusLabel: 'Mismatch',
            extractionConfidence: 'high',
            semanticIssues: [],
          },
        ],
        documentIssues: [
          {
            id: 'doc-1',
            title: 'Application form',
            semanticStatus: 'mismatch',
            semanticStatusLabel: 'Mismatch',
            extractionConfidence: 'high',
          },
        ],
        references: ['Law 2020'],
      },
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/assistant']}>
          <Routes>
            <Route path="/assistant" element={<AssistantPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(mockApi.getAssistantSession).toHaveBeenCalledWith('sub-1');
    });

    expect(await screen.findByText('Application form')).toBeInTheDocument();
    expect(screen.getByText('Business name mismatch')).toBeInTheDocument();
  });

  it('can reach /support from the main site navigation', async () => {
    render(
      <AuthContext.Provider value={publicAuthValue}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <SiteLayout>
                  <div>Home</div>
                </SiteLayout>
              }
            />
            <Route path="/support" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const supportLink = document.querySelector('a[href="/support"]');
    expect(supportLink).not.toBeNull();
    fireEvent.click(supportLink!);

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/support');
    });
  });
});
