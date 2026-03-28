import { Request, Response } from 'express';

import { submissionService } from '../services/submission.service';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';

export const submissionController = {
  async create(req: Request, res: Response) {
    const submission = await submissionService.createDraft(req.currentUser!);
    await userService.setDefaultSubmission(req.currentUser!.id, submission.id);
    return sendSuccess(res, submission, 201, 'Submission created');
  },

  async list(req: Request, res: Response) {
    const data = await submissionService.list(req.currentUser!.id, {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      status: typeof req.query.status === 'string' ? (req.query.status as never) : undefined,
      type: typeof req.query.type === 'string' ? (req.query.type as never) : undefined,
      page: typeof req.query.page === 'string' ? Number(req.query.page) : undefined,
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
    });

    return sendSuccess(res, data);
  },

  async getById(req: Request, res: Response) {
    const submission = await submissionService.getById(
      req.params.submissionId,
      req.currentUser!.id,
    );
    if (submission.status === 'submitted') {
      await userService.clearDefaultSubmissionIfMatches(req.currentUser!.id, submission.id);
    } else {
      await userService.setDefaultSubmission(req.currentUser!.id, submission.id);
    }
    return sendSuccess(res, submission);
  },

  async updateOwner(req: Request, res: Response) {
    const submission = await submissionService.updateOwner(
      req.params.submissionId,
      req.currentUser!.id,
      req.body,
    );
    return sendSuccess(res, submission, 200, 'Owner information updated');
  },

  async updateBusiness(req: Request, res: Response) {
    const submission = await submissionService.updateBusiness(
      req.params.submissionId,
      req.currentUser!.id,
      req.body,
    );
    return sendSuccess(res, submission, 200, 'Business information updated');
  },

  async updateIndustry(req: Request, res: Response) {
    const submission = await submissionService.updateIndustry(
      req.params.submissionId,
      req.currentUser!.id,
      req.body,
    );
    return sendSuccess(res, submission, 200, 'Industry information updated');
  },

  async submit(req: Request, res: Response) {
    const submission = await submissionService.submit(
      req.params.submissionId,
      req.currentUser!.id,
    );
    return sendSuccess(res, submission, 200, 'Submission completed');
  },
};
