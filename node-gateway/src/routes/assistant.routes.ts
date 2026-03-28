import { Router } from 'express';

import { assistantController } from '../controllers/assistant.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router({ mergeParams: true });

router.get('/session', asyncHandler(assistantController.getSession));
router.post('/messages', asyncHandler(assistantController.createMessage));

export const assistantRoutes = router;
