import { Request, Response } from 'express';

import { libraryService } from '../services/library.service';
import { sendSuccess } from '../utils/response';

export const libraryController = {
  async getCategories(_req: Request, res: Response) {
    const categories = await libraryService.getCategories();
    return sendSuccess(res, categories);
  },

  async getFeatured(_req: Request, res: Response) {
    const featured = await libraryService.getFeatured();
    return sendSuccess(res, featured);
  },

  async listDocuments(req: Request, res: Response) {
    const documents = await libraryService.listDocuments({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      page: typeof req.query.page === 'string' ? Number(req.query.page) : undefined,
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
    });
    return sendSuccess(res, documents);
  },

  async getRelated(req: Request, res: Response) {
    const related = await libraryService.getRelated(
      typeof req.query.submissionId === 'string' ? req.query.submissionId : undefined,
      req.currentUser?.id,
    );
    return sendSuccess(res, related);
  },
};
