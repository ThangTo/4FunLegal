import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getAuthMe: vi.fn(),
    loginAuth: vi.fn(),
    registerAuth: vi.fn(),
    refreshAuth: vi.fn(),
    completeProfile: vi.fn(),
    logoutAuth: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  api: mockApi,
}));

import { AuthProvider, useAuth } from './AuthContext';

const authUser = {
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

const AuthConsumer = () => {
  const { isLoading, logout, user } = useAuth();

  if (isLoading) {
    return <div>Loading auth...</div>;
  }

  return (
    <div>
      <span>{user ? user.email : 'guest'}</span>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the user state after logout', async () => {
    mockApi.getAuthMe.mockResolvedValue(authUser);
    mockApi.logoutAuth.mockResolvedValue({ loggedOut: true });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(await screen.findByText('demo@example.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument();
    });
  });
});
