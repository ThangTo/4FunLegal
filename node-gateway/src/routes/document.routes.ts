import { Router } from 'express';

import { documentController } from '../controllers/document.controller';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(documentController.list));
router.post('/', uploadMiddleware.array('files', 5), asyncHandler(documentController.upload));
router.patch('/:documentId', asyncHandler(documentController.updateType));
router.delete('/:documentId', asyncHandler(documentController.remove));

export const documentRoutes = router;
