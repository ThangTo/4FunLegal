import crypto from 'node:crypto';

import { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from './app-error';

export type UserRole = 'user' | 'admin';

type BaseTokenPayload = {
  sub: string;
  sid: string;
};

export type AccessTokenPayload = BaseTokenPayload & {
  role: UserRole;
  type: 'access';
};

export type RefreshTokenPayload = BaseTokenPayload & {
  type: 'refresh';
};

type GoogleStatePayload = {
  redirectPath: string;
  type: 'google-state';
};

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_SCOPE = 'openid email profile';

const getNumberEnv = (key: string, fallback: number) => {
  const rawValue = process.env[key];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const getStringEnv = (key: string, fallback?: string) => {
  const rawValue = process.env[key]?.trim();

  if (rawValue) {
    return rawValue;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new AppError(`Missing required environment variable: ${key}`, 500, 'ENV_MISSING');
};

const getAccessSecret = () =>
  getStringEnv(
    'JWT_ACCESS_SECRET',
    process.env.NODE_ENV === 'production' ? undefined : 'dev-access-secret',
  );

const getRefreshSecret = () =>
  getStringEnv(
    'JWT_REFRESH_SECRET',
    process.env.NODE_ENV === 'production' ? undefined : 'dev-refresh-secret',
  );

export const getFrontendOrigin = () =>
  getStringEnv('FRONTEND_ORIGIN', DEFAULT_FRONTEND_ORIGIN);

export const getAllowedOrigins = () => {
  const configuredOrigins = process.env.FRONTEND_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return configuredOrigins;
  }

  return [DEFAULT_FRONTEND_ORIGIN];
};

export const getAccessTokenTtlMinutes = () =>
  getNumberEnv('ACCESS_TOKEN_TTL_MINUTES', 15);

export const getRefreshTokenTtlDays = () =>
  getNumberEnv('REFRESH_TOKEN_TTL_DAYS', 7);

export const getAccessTokenMaxAgeMs = () => getAccessTokenTtlMinutes() * 60_000;

export const getRefreshTokenMaxAgeMs = () =>
  getRefreshTokenTtlDays() * 24 * 60 * 60_000;

const shouldUseSecureCookies = () => process.env.COOKIE_SECURE === 'true';

const getBaseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: shouldUseSecureCookies(),
});

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) => {
  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...getBaseCookieOptions(),
    path: '/',
    maxAge: getAccessTokenMaxAgeMs(),
  });
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...getBaseCookieOptions(),
    path: '/api/v1/auth',
    maxAge: getRefreshTokenMaxAgeMs(),
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE_NAME, { ...getBaseCookieOptions(), path: '/' });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getBaseCookieOptions(),
    path: '/api/v1/auth',
  });
};

export const getAccessCookieName = () => ACCESS_COOKIE_NAME;

export const getRefreshCookieName = () => REFRESH_COOKIE_NAME;

export const hashRefreshToken = (refreshToken: string) =>
  crypto.createHash('sha256').update(refreshToken).digest('hex');

export const createAccessToken = (payload: Omit<AccessTokenPayload, 'type'>) =>
  jwt.sign({ ...payload, type: 'access' }, getAccessSecret(), {
    expiresIn: `${getAccessTokenTtlMinutes()}m`,
  });

export const createRefreshToken = (payload: Omit<RefreshTokenPayload, 'type'>) =>
  jwt.sign({ ...payload, type: 'refresh' }, getRefreshSecret(), {
    expiresIn: `${getRefreshTokenTtlDays()}d`,
  });

const verifyToken = <TPayload>(token: string, secret: string, expectedType: string) => {
  try {
    const decoded = jwt.verify(token, secret) as TPayload & { type?: string };

    if (decoded.type !== expectedType) {
      throw new AppError('Invalid authentication token', 401, 'AUTH_TOKEN_INVALID');
    }

    return decoded;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired authentication token', 401, 'AUTH_TOKEN_INVALID');
  }
};

export const verifyAccessToken = (token: string) =>
  verifyToken<AccessTokenPayload>(token, getAccessSecret(), 'access');

export const verifyRefreshToken = (token: string) =>
  verifyToken<RefreshTokenPayload>(token, getRefreshSecret(), 'refresh');

export const createGoogleStateToken = (redirectPath: string) =>
  jwt.sign(
    { redirectPath, type: 'google-state' },
    getRefreshSecret(),
    { expiresIn: '10m' },
  );

export const verifyGoogleStateToken = (token: string) =>
  verifyToken<GoogleStatePayload>(token, getRefreshSecret(), 'google-state');

export const createGoogleAuthorizationUrl = (redirectPath: string) => {
  const params = new URLSearchParams({
    client_id: getStringEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: getStringEnv('GOOGLE_CALLBACK_URL'),
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'online',
    state: createGoogleStateToken(redirectPath),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

export const sanitizeRedirectPath = (redirectPath?: string | null) => {
  if (!redirectPath) {
    return '/register';
  }

  if (!redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
    return '/register';
  }

  return redirectPath;
};

export const buildFrontendRedirectUrl = (path: string) => {
  const sanitizedPath = sanitizeRedirectPath(path);
  return new URL(sanitizedPath, getFrontendOrigin()).toString();
};

export const createSessionId = () => crypto.randomUUID();

export const getGoogleTokenConfig = () => ({
  clientId: getStringEnv('GOOGLE_CLIENT_ID'),
  clientSecret: getStringEnv('GOOGLE_CLIENT_SECRET'),
  callbackUrl: getStringEnv('GOOGLE_CALLBACK_URL'),
});
