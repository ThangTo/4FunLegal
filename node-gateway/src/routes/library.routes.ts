import { Router } from 'express';

import { libraryController } from '../controllers/library.controller';
import { authenticateOptional } from '../middlewares/auth.middleware';
import { subscriptionController } from '../controllers/subscription.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/categories', asyncHandler(libraryController.getCategories));
router.get('/featured', asyncHandler(libraryController.getFeatured));
router.get('/documents', asyncHandler(libraryController.listDocuments));
router.get('/documents/:slug', asyncHandler(libraryController.getDocumentDetail));
router.get('/related', authenticateOptional, asyncHandler(libraryController.getRelated));
router.post('/subscriptions', asyncHandler(subscriptionController.create));

export const libraryRoutes = router;
