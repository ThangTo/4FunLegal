import { Router } from 'express';

import { authController } from '../controllers/auth.controller';
import { authenticateRequired } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticateRequired, asyncHandler(authController.me));
router.patch('/profile', authenticateRequired, asyncHandler(authController.updateProfile));
router.get('/google/start', asyncHandler(authController.startGoogle));
router.get('/google/callback', asyncHandler(authController.googleCallback));

export const authRoutes = router;
