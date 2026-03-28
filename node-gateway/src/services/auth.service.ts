import axios from 'axios';

import { AuthSessionModel, IAuthSessionDocument } from '../models/auth-session.model';
import { UserModel } from '../models/user.model';
import { AppError } from '../utils/app-error';
import {
  buildFrontendRedirectUrl,
  createAccessToken,
  createGoogleAuthorizationUrl,
  createRefreshToken,
  createSessionId,
  getGoogleTokenConfig,
  getRefreshTokenMaxAgeMs,
  hashRefreshToken,
  sanitizeRedirectPath,
  verifyAccessToken,
  verifyGoogleStateToken,
  verifyRefreshToken,
} from '../utils/auth';
import { hashPassword, verifyPassword } from '../utils/auth-password';
import { toUserResponse } from './user.service';

type SessionRequestMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

const MIN_PASSWORD_LENGTH = 8;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizePhone = (phone: string) => phone.trim();

const assertValidEmail = (email: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Email không hợp lệ', 400, 'AUTH_INVALID_EMAIL');
  }
};

const assertValidPassword = (password: string) => {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      'Mật khẩu phải có ít nhất 8 ký tự',
      400,
      'AUTH_INVALID_PASSWORD',
    );
  }
};

const assertValidPhone = (phone: string) => {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length < 9 || digitsOnly.length > 15) {
    throw new AppError('Số điện thoại không hợp lệ', 400, 'AUTH_INVALID_PHONE');
  }
};

const assertValidFullName = (fullName: string) => {
  if (fullName.trim().length < 2) {
    throw new AppError('Họ tên không hợp lệ', 400, 'AUTH_INVALID_FULL_NAME');
  }
};

const getSessionExpiryDate = () => new Date(Date.now() + getRefreshTokenMaxAgeMs());

const buildRequestUser = (
  user: {
    _id: string | { toString(): string };
    fullName: string;
    email: string;
    phone?: string | null;
    status: 'active' | 'inactive';
    role: 'user' | 'admin';
    defaultSubmissionId?: string | null;
    avatarUrl?: string | null;
  },
  sessionId: string,
) => ({
  ...toUserResponse(user),
  sessionId,
});

const getActiveUserById = async (userId: string) => {
  const user = await UserModel.findOne({ _id: userId, status: 'active' }).lean();

  if (!user) {
    throw new AppError('Người dùng không tồn tại hoặc đã bị khóa', 401, 'AUTH_USER_NOT_FOUND');
  }

  return user;
};

const createSessionTokens = async (
  user: {
    id: string;
    role: 'user' | 'admin';
  },
  metadata: SessionRequestMetadata,
  previousSessionId?: string,
) => {
  const sessionId = createSessionId();
  const accessToken = createAccessToken({
    sub: user.id,
    sid: sessionId,
    role: user.role,
  });
  const refreshToken = createRefreshToken({
    sub: user.id,
    sid: sessionId,
  });

  await AuthSessionModel.create({
    userId: user.id,
    sessionId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    userAgent: metadata.userAgent ?? null,
    ipAddress: metadata.ipAddress ?? null,
    expiresAt: getSessionExpiryDate(),
  });

  if (previousSessionId) {
    await AuthSessionModel.findOneAndUpdate(
      { sessionId: previousSessionId },
      {
        revokedAt: new Date(),
        replacedBySessionId: sessionId,
      },
    );
  }

  return {
    sessionId,
    tokens: {
      accessToken,
      refreshToken,
    } satisfies AuthTokens,
  };
};

const revokeSessionChain = async (sessionId: string) => {
  let nextSessionId: string | null = sessionId;
  const revokedAt = new Date();

  while (nextSessionId) {
    const currentSessionId: string = nextSessionId;
    const session: IAuthSessionDocument | null = await AuthSessionModel.findOne({
      sessionId: currentSessionId,
    });

    if (!session) {
      break;
    }

    if (!session.revokedAt) {
      session.revokedAt = revokedAt;
      await session.save();
    }

    nextSessionId = session.replacedBySessionId ?? null;
  }
};

const exchangeGoogleCode = async (code: string) => {
  const { clientId, clientSecret, callbackUrl } = getGoogleTokenConfig();
  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
  });

  const tokenResponse = await axios.post<{
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token?: string;
  }>('https://oauth2.googleapis.com/token', tokenParams.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const googleAccessToken = tokenResponse.data.access_token;

  if (!googleAccessToken) {
    throw new AppError('Không thể xác thực với Google', 401, 'AUTH_GOOGLE_EXCHANGE_FAILED');
  }

  const profileResponse = await axios.get<GoogleUserInfo>(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    },
  );

  return profileResponse.data;
};

export const authService = {
  async register(
    payload: {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    },
    metadata: SessionRequestMetadata,
  ) {
    const fullName = payload.fullName?.trim() ?? '';
    const email = normalizeEmail(payload.email ?? '');
    const phone = normalizePhone(payload.phone ?? '');
    const password = payload.password ?? '';

    assertValidFullName(fullName);
    assertValidEmail(email);
    assertValidPhone(phone);
    assertValidPassword(password);

    const existingUser = await UserModel.findOne({ email }).lean();

    if (existingUser) {
      throw new AppError('Email đã được sử dụng', 409, 'AUTH_EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const createdUser = await UserModel.create({
      fullName,
      email,
      phone,
      passwordHash,
      role: 'user',
      status: 'active',
    });

    const { sessionId, tokens } = await createSessionTokens(
      { id: createdUser.id, role: createdUser.role },
      metadata,
    );

    return {
      user: buildRequestUser(createdUser, sessionId),
      tokens,
    };
  },

  async login(
    payload: {
      email?: string;
      password?: string;
    },
    metadata: SessionRequestMetadata,
  ) {
    const email = normalizeEmail(payload.email ?? '');
    const password = payload.password ?? '';

    assertValidEmail(email);

    const user = await UserModel.findOne({ email, status: 'active' });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const { sessionId, tokens } = await createSessionTokens(
      { id: user.id, role: user.role },
      metadata,
    );

    return {
      user: buildRequestUser(user, sessionId),
      tokens,
    };
  },

  async getMe(userId: string, sessionId: string) {
    const user = await getActiveUserById(userId);
    return buildRequestUser(user, sessionId);
  },

  async completeProfile(
    userId: string,
    sessionId: string,
    payload: {
      phone?: string;
    },
  ) {
    const phone = normalizePhone(payload.phone ?? '');
    assertValidPhone(phone);

    const user = await UserModel.findOneAndUpdate(
      { _id: userId, status: 'active' },
      { phone },
      { new: true },
    );

    if (!user) {
      throw new AppError('Người dùng không tồn tại', 404, 'AUTH_USER_NOT_FOUND');
    }

    return buildRequestUser(user, sessionId);
  },

  async refreshSession(refreshToken: string, metadata: SessionRequestMetadata) {
    const payload = verifyRefreshToken(refreshToken);
    const session = await AuthSessionModel.findOne({
      sessionId: payload.sid,
      userId: payload.sub,
    });

    if (!session) {
      throw new AppError('Phiên đăng nhập không còn hợp lệ', 401, 'AUTH_SESSION_NOT_FOUND');
    }

    const isExpired = session.expiresAt.getTime() <= Date.now();
    const hashedToken = hashRefreshToken(refreshToken);
    const isTokenMismatch = session.refreshTokenHash !== hashedToken;
    const isRevoked = Boolean(session.revokedAt);

    if (isExpired || isTokenMismatch || isRevoked) {
      await revokeSessionChain(session.sessionId);
      throw new AppError('Phiên đăng nhập đã hết hạn hoặc bị thu hồi', 401, 'AUTH_REFRESH_REUSED');
    }

    const user = await getActiveUserById(payload.sub);
    const { sessionId, tokens } = await createSessionTokens(
      { id: String(user._id), role: user.role },
      metadata,
      session.sessionId,
    );

    return {
      user: buildRequestUser(user, sessionId),
      tokens,
    };
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      await revokeSessionChain(payload.sid);
    } catch {
      return;
    }
  },

  async resolveCurrentUserFromAccessToken(accessToken: string) {
    const payload = verifyAccessToken(accessToken);
    const session = await AuthSessionModel.findOne({
      sessionId: payload.sid,
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!session) {
      throw new AppError('Phiên đăng nhập không còn hiệu lực', 401, 'AUTH_SESSION_REVOKED');
    }

    const user = await getActiveUserById(payload.sub);
    return buildRequestUser(user, session.sessionId);
  },

  getGoogleAuthorizationUrl(redirectPath?: string | null) {
    return createGoogleAuthorizationUrl(sanitizeRedirectPath(redirectPath));
  },

  async handleGoogleCallback(
    payload: {
      code?: string;
      state?: string;
      error?: string;
    },
    metadata: SessionRequestMetadata,
  ) {
    if (payload.error) {
      return {
        redirectUrl: buildFrontendRedirectUrl('/auth/login?error=google_auth_cancelled'),
        tokens: null,
      };
    }

    if (!payload.code || !payload.state) {
      throw new AppError('Thiếu dữ liệu xác thực Google', 400, 'AUTH_GOOGLE_CALLBACK_INVALID');
    }

    const statePayload = verifyGoogleStateToken(payload.state);
    const googleProfile = await exchangeGoogleCode(payload.code);

    if (!googleProfile.sub || !googleProfile.email) {
      throw new AppError(
        'Google không trả về đủ thông tin người dùng',
        401,
        'AUTH_GOOGLE_PROFILE_INVALID',
      );
    }

    const normalizedEmail = normalizeEmail(googleProfile.email);
    let user = await UserModel.findOne({
      $or: [{ googleSub: googleProfile.sub }, { email: normalizedEmail }],
    });

    if (user && user.status !== 'active') {
      throw new AppError('Tài khoản đã bị khóa', 403, 'AUTH_USER_INACTIVE');
    }

    if (!user) {
      user = await UserModel.create({
        fullName: googleProfile.name?.trim() || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        phone: null,
        role: 'user',
        status: 'active',
        googleSub: googleProfile.sub,
        avatarUrl: googleProfile.picture ?? null,
      });
    } else if (!user.googleSub) {
      user.googleSub = googleProfile.sub;
      user.avatarUrl = googleProfile.picture ?? user.avatarUrl ?? null;
      await user.save();
    } else if (user.googleSub !== googleProfile.sub) {
      throw new AppError(
        'Tài khoản Google không khớp với email đã liên kết',
        409,
        'AUTH_GOOGLE_ACCOUNT_CONFLICT',
      );
    }

    const { sessionId, tokens } = await createSessionTokens(
      { id: user.id, role: user.role },
      metadata,
    );

    const redirectTarget = user.phone
      ? sanitizeRedirectPath(statePayload.redirectPath)
      : `/auth/complete-profile?redirect=${encodeURIComponent(
          sanitizeRedirectPath(statePayload.redirectPath),
        )}`;

    return {
      redirectUrl: buildFrontendRedirectUrl(redirectTarget),
      tokens,
      user: buildRequestUser(user, sessionId),
    };
  },
};
