import { Router } from 'express';

import { submissionController } from '../controllers/submission.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post('/', asyncHandler(submissionController.create));
router.get('/', asyncHandler(submissionController.list));
router.get('/:submissionId', asyncHandler(submissionController.getById));
router.patch('/:submissionId/owner', asyncHandler(submissionController.updateOwner));
router.patch('/:submissionId/business', asyncHandler(submissionController.updateBusiness));
router.patch('/:submissionId/industry', asyncHandler(submissionController.updateIndustry));
router.post('/:submissionId/submit', asyncHandler(submissionController.submit));

export const submissionRoutes = router;
