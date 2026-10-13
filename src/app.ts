import 'reflect-metadata';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Container } from './infrastructure/container.js';
import { corsOrigins } from './infrastructure/config/env.js';
import { errorHandler } from './presentation/http/middlewares/errorHandler.js';
import { notFoundHandler } from './presentation/http/middlewares/notFound.js';
import { apiRateLimiter } from './presentation/http/middlewares/rateLimit.js';
import { createApiRouter } from './presentation/http/routes/index.js';
import { mountOpenApi } from './presentation/http/openapi/mountOpenApi.js';

/**
 * Builds the Express application from an already-wired container. Kept free of
 * process-level concerns (listening, signals) which live in server.ts, so it
 * can be constructed directly in tests.
 */
export function createApp(container: Container): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '100kb' }));
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  mountOpenApi(app);

  app.use(
    '/api/v1',
    createApiRouter({
      authController: container.controllers.authController,
      messageController: container.controllers.messageController,
      tokenService: container.services.tokenService,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
