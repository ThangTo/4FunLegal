import { Request, Response } from 'express';

import { legalAssistantService } from '../services/legal-assistant.service';
import { sendSuccess } from '../utils/response';

export const legalAssistantController = {
  async getSession(_req: Request, res: Response) {
    const session = await legalAssistantService.getSession();
    return sendSuccess(res, session);
  },

  async createMessage(req: Request, res: Response) {
    const response = await legalAssistantService.createMessage(
      req.body.message,
      req.body.history,
      req.body.context,
    );
    return sendSuccess(res, response, 201, 'Legal assistant reply created');
  },
};
