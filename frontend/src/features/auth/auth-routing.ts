import { AuthUser } from '../../lib/api';

export const sanitizeAuthRedirect = (redirectPath?: string | null) => {
  if (!redirectPath || !redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
    return '/register';
  }

  return redirectPath;
};

export const getPostAuthRedirect = (user: AuthUser, redirectPath?: string | null) => {
  const nextPath = sanitizeAuthRedirect(redirectPath);

  if (!user.profileCompleted) {
    return `/auth/complete-profile?redirect=${encodeURIComponent(nextPath)}`;
  }

  return nextPath;
};
