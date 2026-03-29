import { Router } from 'express';

import { legalAssistantController } from '../controllers/legal-assistant.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/session', asyncHandler(legalAssistantController.getSession));
router.post('/messages', asyncHandler(legalAssistantController.createMessage));

export const legalAssistantRoutes = router;
