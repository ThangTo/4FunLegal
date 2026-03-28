import { Request, Response } from 'express';

import { authService } from '../services/auth.service';
import { AppError } from '../utils/app-error';
import { buildFrontendRedirectUrl, clearAuthCookies, setAuthCookies } from '../utils/auth';
import { sendSuccess } from '../utils/response';

const getSessionRequestMetadata = (req: Request) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ipAddress: req.ip,
});

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body, getSessionRequestMetadata(req));
    setAuthCookies(res, result.tokens);
    return sendSuccess(res, { user: result.user }, 201, 'Registered successfully');
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, getSessionRequestMetadata(req));
    setAuthCookies(res, result.tokens);
    return sendSuccess(res, { user: result.user }, 200, 'Logged in successfully');
  },

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      clearAuthCookies(res);
      throw new AppError('Refresh token not found', 401, 'AUTH_REFRESH_MISSING');
    }

    try {
      const result = await authService.refreshSession(
        refreshToken,
        getSessionRequestMetadata(req),
      );
      setAuthCookies(res, result.tokens);
      return sendSuccess(res, { user: result.user }, 200, 'Session refreshed');
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  },

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    return sendSuccess(res, { loggedOut: true }, 200, 'Logged out successfully');
  },

  async me(req: Request, res: Response) {
    const user = await authService.getMe(req.currentUser!.id, req.currentUser!.sessionId);
    return sendSuccess(res, user);
  },

  async updateProfile(req: Request, res: Response) {
    const user = await authService.completeProfile(
      req.currentUser!.id,
      req.currentUser!.sessionId,
      req.body,
    );
    return sendSuccess(res, user, 200, 'Profile updated successfully');
  },

  async startGoogle(req: Request, res: Response) {
    const redirectPath =
      typeof req.query.redirect === 'string' ? req.query.redirect : undefined;
    const authorizationUrl = authService.getGoogleAuthorizationUrl(redirectPath);
    res.redirect(authorizationUrl);
  },

  async googleCallback(req: Request, res: Response) {
    try {
      const result = await authService.handleGoogleCallback(
        {
          code: typeof req.query.code === 'string' ? req.query.code : undefined,
          state: typeof req.query.state === 'string' ? req.query.state : undefined,
          error: typeof req.query.error === 'string' ? req.query.error : undefined,
        },
        getSessionRequestMetadata(req),
      );

      if (result.tokens) {
        setAuthCookies(res, result.tokens);
      } else {
        clearAuthCookies(res);
      }

      res.redirect(result.redirectUrl);
    } catch {
      clearAuthCookies(res);
      res.redirect(buildFrontendRedirectUrl('/auth/login?error=google_auth_failed'));
    }
  },
};
