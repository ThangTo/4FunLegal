import { Request, Response } from 'express';

import { documentService } from '../services/document.service';
import { sendSuccess } from '../utils/response';

export const documentController = {
  async list(req: Request, res: Response) {
    const data = await documentService.list(req.params.submissionId, req.currentUser!.id);
    return sendSuccess(res, data);
  },

  async upload(req: Request, res: Response) {
    const files = Array.isArray(req.files) ? req.files : [];
    const data = await documentService.upload(
      req.params.submissionId,
      req.currentUser!.id,
      files,
    );
    return sendSuccess(res, data, 201, 'Documents uploaded');
  },

  async updateType(req: Request, res: Response) {
    const data = await documentService.updateType(
      req.params.submissionId,
      req.currentUser!.id,
      req.params.documentId,
      req.body.documentType,
    );
    return sendSuccess(res, data, 200, 'Document type updated');
  },

  async remove(req: Request, res: Response) {
    const data = await documentService.remove(
      req.params.submissionId,
      req.currentUser!.id,
      req.params.documentId,
    );
    return sendSuccess(res, data, 200, 'Document deleted');
  },
};
