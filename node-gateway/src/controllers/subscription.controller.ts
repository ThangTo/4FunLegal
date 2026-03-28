import { Request, Response } from 'express';

import { subscriptionService } from '../services/subscription.service';
import { AppError } from '../utils/app-error';
import { sendSuccess } from '../utils/response';

export const subscriptionController = {
  async create(req: Request, res: Response) {
    if (!req.body.email) {
      throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
    }

    const subscription = await subscriptionService.create(
      req.body.email,
      req.body.source,
    );

    return sendSuccess(res, subscription, 201, 'Subscription saved');
  },
};
