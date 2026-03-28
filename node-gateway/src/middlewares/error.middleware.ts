import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/app-error';

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(error.message || 'Internal server error');

  return res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
};
