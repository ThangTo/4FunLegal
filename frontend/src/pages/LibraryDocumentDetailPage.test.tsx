import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getLibraryDocumentDetail: vi.fn(),
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
import { LibraryDocumentDetailPage } from './LibraryDocumentDetailPage';

const publicAuthValue: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  refreshSession: vi.fn(),
  completeProfile: vi.fn(),
  logout: vi.fn(),
};

describe('LibraryDocumentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads official document detail with roadmap and source actions', async () => {
    mockApi.getLibraryDocumentDetail.mockResolvedValue({
      slug: 'dang-ky-thanh-lap-ho-kinh-doanh',
      title: 'Đăng ký thành lập hộ kinh doanh',
      summary: 'Thủ tục chính thức trên Cổng Dịch vụ công Quốc gia.',
      category: 'procedure',
      updatedAtLabel: 'Hiện hành',
      tag: 'Chính thức',
      accent: 'secondary',
      featured: 'hero',
      eyebrow: 'Cổng DVC Quốc gia',
      actionKind: 'learn',
      sourceName: 'Cổng Dịch vụ công Quốc gia',
      sourceUrl:
        'https://dichvucong.gov.vn/p/home/dvc-chi-tiet-thu-tuc-nganh-doc.html?ma_thu_tuc=1.001612.000.00.00.H01',
      downloadUrl: 'https://csdl.dichvucong.gov.vn/web/jsp/download_file.jsp?ma=3fc7f4acf121cfd8',
      downloadLabel: 'Tải mẫu giấy đề nghị',
      documentNumber: '1.001612.000.00.00.H01',
      issuedBy: 'Cổng Dịch vụ công Quốc gia',
      issuedDateLabel: 'Trang thủ tục hiện hành',
      effectiveDateLabel: 'Áp dụng trên hệ thống hộ kinh doanh',
      highlights: ['Hồ sơ trực tuyến phải có giấy đề nghị đăng ký hộ kinh doanh.'],
      roadmap: [
        {
          step: 1,
          title: 'Đăng nhập và xác thực',
          description: 'Người nộp hồ sơ dùng tài khoản định danh điện tử để đăng nhập.',
        },
      ],
      officialLinks: [
        {
          label: 'Xem thủ tục trên Cổng DVC Quốc gia',
          url: 'https://dichvucong.gov.vn/p/home/dvc-chi-tiet-thu-tuc-nganh-doc.html?ma_thu_tuc=1.001612.000.00.00.H01',
          kind: 'source',
        },
      ],
    });

    render(
      <AuthContext.Provider value={publicAuthValue}>
        <MemoryRouter initialEntries={['/library/dang-ky-thanh-lap-ho-kinh-doanh']}>
          <Routes>
            <Route path="/library/:slug" element={<LibraryDocumentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Đăng ký thành lập hộ kinh doanh' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Đăng nhập và xác thực')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.getLibraryDocumentDetail).toHaveBeenCalledWith(
        'dang-ky-thanh-lap-ho-kinh-doanh',
      );
    });

    expect(
      screen.getByRole('link', {
        name: /Xem nguồn chính thức/i,
      }),
    ).toHaveAttribute(
      'href',
      'https://dichvucong.gov.vn/p/home/dvc-chi-tiet-thu-tuc-nganh-doc.html?ma_thu_tuc=1.001612.000.00.00.H01',
    );
  });
});
