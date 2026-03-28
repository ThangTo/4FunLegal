import { Request, Response } from 'express';

import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';

export const userController = {
  async getCurrent(req: Request, res: Response) {
    const user = await userService.getCurrentUser(req.currentUser!.id);
    return sendSuccess(res, user);
  },
};
