import { describe, expect, it, vi } from 'vitest';

import { requireRole } from '../middlewares/auth.middleware';

describe('requireRole middleware', () => {
  it('returns 401 when there is no authenticated user', () => {
    const middleware = requireRole('admin');
    const next = vi.fn();

    middleware({} as never, {} as never, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('returns 403 when the user does not have the required role', () => {
    const middleware = requireRole('admin');
    const next = vi.fn();

    middleware(
      {
        currentUser: {
          id: 'user-1',
          fullName: 'Demo User',
          email: 'demo@example.com',
          phone: '0900000000',
          status: 'active',
          role: 'user',
          defaultSubmissionId: null,
          avatarUrl: null,
          profileCompleted: true,
          missingProfileFields: [],
          sessionId: 'session-1',
        },
      } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('allows the request to continue when the role matches', () => {
    const middleware = requireRole('admin');
    const next = vi.fn();

    middleware(
      {
        currentUser: {
          id: 'admin-1',
          fullName: 'Admin User',
          email: 'admin@example.com',
          phone: '0900000000',
          status: 'active',
          role: 'admin',
          defaultSubmissionId: null,
          avatarUrl: null,
          profileCompleted: true,
          missingProfileFields: [],
          sessionId: 'session-2',
        },
      } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });
});
