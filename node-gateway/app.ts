import path from 'node:path';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { authRoutes } from './src/routes/auth.routes';
import { assistantRoutes } from './src/routes/assistant.routes';
import { contentRoutes } from './src/routes/content.routes';
import { documentRoutes } from './src/routes/document.routes';
import { legalAssistantRoutes } from './src/routes/legal-assistant.routes';
import { libraryRoutes } from './src/routes/library.routes';
import { reviewRoutes } from './src/routes/review.routes';
import { submissionRoutes } from './src/routes/submission.routes';
import { userRoutes } from './src/routes/user.routes';
import {
  authenticateRequired,
  requireCompletedProfile,
} from './src/middlewares/auth.middleware';
import { errorMiddleware } from './src/middlewares/error.middleware';
import { notFoundMiddleware } from './src/middlewares/not-found.middleware';
import { getAllowedOrigins } from './src/utils/auth';
import { sendSuccess } from './src/utils/response';

export const app = express();

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', (_req, res) =>
  sendSuccess(res, { status: 'ok', service: 'node-gateway' }),
);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/legal-assistant', legalAssistantRoutes);
app.use('/api/v1/users', authenticateRequired, userRoutes);
app.use(
  '/api/v1/submissions',
  authenticateRequired,
  requireCompletedProfile,
  submissionRoutes,
);
app.use(
  '/api/v1/submissions/:submissionId/documents',
  authenticateRequired,
  requireCompletedProfile,
  documentRoutes,
);
app.use(
  '/api/v1/submissions/:submissionId/reviews',
  authenticateRequired,
  requireCompletedProfile,
  reviewRoutes,
);
app.use(
  '/api/v1/submissions/:submissionId/assistant',
  authenticateRequired,
  requireCompletedProfile,
  assistantRoutes,
);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
