import { Router } from 'express';

import { contentController } from '../controllers/content.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/pages/:slug', asyncHandler(contentController.getPage));

export const contentRoutes = router;
