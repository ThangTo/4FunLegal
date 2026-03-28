import { NextFunction, Request, Response } from 'express';

import { authService } from '../services/auth.service';
import { AppError } from '../utils/app-error';

const attachCurrentUser = async (req: Request) => {
  const accessToken = req.cookies?.accessToken as string | undefined;

  if (!accessToken) {
    return null;
  }

  const currentUser = await authService.resolveCurrentUserFromAccessToken(accessToken);
  req.currentUser = currentUser;
  return currentUser;
};

export const authenticateRequired = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const currentUser = await attachCurrentUser(req);

    if (!currentUser) {
      next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const authenticateOptional = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    await attachCurrentUser(req);
    next();
  } catch {
    req.currentUser = undefined;
    next();
  }
};

export const requireRole =
  (...roles: Array<'user' | 'admin'>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      return;
    }

    if (!roles.includes(req.currentUser.role)) {
      next(new AppError('You do not have permission to access this resource', 403, 'AUTH_FORBIDDEN'));
      return;
    }

    next();
  };

export const requireCompletedProfile = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.currentUser) {
    next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    return;
  }

  if (!req.currentUser.profileCompleted) {
    next(
      new AppError(
        'Please complete your profile before using this feature',
        403,
        'AUTH_PROFILE_INCOMPLETE',
        { missingProfileFields: req.currentUser.missingProfileFields },
      ),
    );
    return;
  }

  next();
};
