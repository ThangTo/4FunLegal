import { Request, Response } from 'express';

import { assistantService } from '../services/assistant.service';
import { sendSuccess } from '../utils/response';

export const assistantController = {
  async getSession(req: Request, res: Response) {
    const session = await assistantService.getSession(
      req.params.submissionId,
      req.currentUser!.id,
    );
    return sendSuccess(res, session);
  },

  async createMessage(req: Request, res: Response) {
    const response = await assistantService.createMessage(
      req.params.submissionId,
      req.currentUser!.id,
      req.body.message,
    );
    return sendSuccess(res, response, 201, 'Assistant reply created');
  },
};
