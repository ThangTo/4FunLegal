import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthContextValue } from '../features/auth/AuthContext';
import * as googleAuthModule from '../features/auth/google-auth';
import { AuthCompleteProfilePage } from './AuthCompleteProfilePage';
import { AuthLoginPage } from './AuthLoginPage';
import { AuthRegisterPage } from './AuthRegisterPage';

const completeUser = {
  id: 'user-1',
  fullName: 'Demo User',
  email: 'demo@example.com',
  phone: '0901234567',
  status: 'active',
  role: 'user' as const,
  defaultSubmissionId: null,
  avatarUrl: null,
  profileCompleted: true,
  missingProfileFields: [],
};

const incompleteUser = {
  ...completeUser,
  phone: null,
  profileCompleted: false,
  missingProfileFields: ['phone'],
};

const createAuthValue = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  refreshSession: vi.fn(),
  completeProfile: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

const renderAuthRoute = (authValue: AuthContextValue, initialEntry: string) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/auth/login" element={<AuthLoginPage />} />
          <Route path="/auth/register" element={<AuthRegisterPage />} />
          <Route path="/auth/complete-profile" element={<AuthCompleteProfilePage />} />
          <Route path="/history" element={<div>History target</div>} />
          <Route path="/documents" element={<div>Documents target</div>} />
          <Route path="/results" element={<div>Results target</div>} />
          <Route path="/register" element={<div>Register target</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('Auth pages', () => {
  it('redirects to the requested page after successful login', async () => {
    const authValue = createAuthValue({
      login: vi.fn().mockResolvedValue(completeUser),
    });

    renderAuthRoute(authValue, '/auth/login?redirect=%2Fhistory');

    await userEvent.type(screen.getByLabelText('Email'), 'demo@example.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Password@123');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByText('History target')).toBeInTheDocument();
    });
    expect(authValue.login).toHaveBeenCalledWith({
      email: 'demo@example.com',
      password: 'Password@123',
    });
  });

  it('redirects after successful register and auto-login response', async () => {
    const authValue = createAuthValue({
      register: vi.fn().mockResolvedValue(completeUser),
    });

    renderAuthRoute(authValue, '/auth/register?redirect=%2Fdocuments');

    await userEvent.type(screen.getByLabelText('Họ và tên'), 'Demo User');
    await userEvent.type(screen.getByLabelText('Email'), 'demo@example.com');
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0901234567');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Password@123');
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu'), 'Password@123');
    await userEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText('Documents target')).toBeInTheDocument();
    });
    expect(authValue.register).toHaveBeenCalled();
  });

  it('uses the Google redirect helper when continuing with Google', async () => {
    const redirectSpy = vi
      .spyOn(googleAuthModule, 'redirectToGoogleAuth')
      .mockImplementation(() => undefined);

    renderAuthRoute(createAuthValue(), '/auth/login?redirect=%2Fresults');

    await userEvent.click(screen.getByRole('button', { name: /tiếp tục với google/i }));

    expect(redirectSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/google/start?redirect=%2Fresults',
    );
  });

  it('submits the complete-profile page and navigates to the requested destination', async () => {
    const authValue = createAuthValue({
      user: incompleteUser,
      isAuthenticated: true,
      completeProfile: vi.fn().mockResolvedValue(completeUser),
    });

    renderAuthRoute(authValue, '/auth/complete-profile?redirect=%2Fregister');

    await userEvent.clear(screen.getByLabelText('Số điện thoại'));
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0912345678');
    await userEvent.click(screen.getByRole('button', { name: /hoàn tất và tiếp tục/i }));

    await waitFor(() => {
      expect(screen.getByText('Register target')).toBeInTheDocument();
    });
    expect(authValue.completeProfile).toHaveBeenCalledWith({ phone: '0912345678' });
  });
});
