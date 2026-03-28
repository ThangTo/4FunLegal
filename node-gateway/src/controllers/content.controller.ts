import { Request, Response } from 'express';

import { contentService } from '../services/content.service';
import { AppError } from '../utils/app-error';
import { sendSuccess } from '../utils/response';

export const contentController = {
  async getPage(req: Request, res: Response) {
    const slug = req.params.slug;

    if (slug !== 'landing' && slug !== 'guide') {
      throw new AppError('Unsupported page slug', 404, 'CONTENT_NOT_FOUND');
    }

    const page = await contentService.getPage(slug);
    return sendSuccess(res, page);
  },
};
