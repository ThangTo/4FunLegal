import { Request, Response } from 'express';

import { reviewService } from '../services/review.service';
import { sendSuccess } from '../utils/response';

export const reviewController = {
  async create(req: Request, res: Response) {
    const review = await reviewService.create(req.params.submissionId, req.currentUser!.id);
    return sendSuccess(res, review, 201, 'Review started');
  },

  async getLatest(req: Request, res: Response) {
    const review = await reviewService.getLatest(req.params.submissionId, req.currentUser!.id);
    return sendSuccess(res, review);
  },

  async getLatestResult(req: Request, res: Response) {
    const result = await reviewService.getLatestResult(
      req.params.submissionId,
      req.currentUser!.id,
    );
    return sendSuccess(res, result);
  },
};
