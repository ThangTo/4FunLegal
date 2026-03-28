import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/current', asyncHandler(userController.getCurrent));

export const userRoutes = router;
