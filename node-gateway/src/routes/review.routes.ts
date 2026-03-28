import { Router } from 'express';

import { reviewController } from '../controllers/review.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router({ mergeParams: true });

router.post('/', asyncHandler(reviewController.create));
router.get('/latest', asyncHandler(reviewController.getLatest));
router.get('/latest/result', asyncHandler(reviewController.getLatestResult));

export const reviewRoutes = router;
