import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthContextValue } from '../features/auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
};

const renderProtectedRoute = (
  authValue: AuthContextValue,
  initialEntry: string,
) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <div>Secret content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/login" element={<LocationDisplay />} />
          <Route path="/auth/complete-profile" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const baseAuthValue: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  refreshSession: vi.fn(),
  completeProfile: vi.fn(),
  logout: vi.fn(),
};

describe('ProtectedRoute', () => {
  afterEach(() => {
    cleanup();
  });

  it('redirects unauthenticated users to the login page with redirect query', () => {
    renderProtectedRoute(baseAuthValue, '/results?step=2');

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/auth/login?redirect=%2Fresults%3Fstep%3D2',
    );
  });

  it('redirects incomplete-profile users to the completion page', () => {
    renderProtectedRoute(
      {
        ...baseAuthValue,
        user: {
          id: 'user-1',
          fullName: 'Demo User',
          email: 'demo@example.com',
          phone: null,
          status: 'active',
          role: 'user',
          defaultSubmissionId: null,
          avatarUrl: null,
          profileCompleted: false,
          missingProfileFields: ['phone'],
        },
        isAuthenticated: true,
      },
      '/results',
    );

    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/auth/complete-profile?redirect=%2Fresults',
    );
  });
});
