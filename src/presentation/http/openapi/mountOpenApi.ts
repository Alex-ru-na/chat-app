import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../../../infrastructure/config/env.js';
import { openApiDocument } from './openApiDocument.js';

export function mountOpenApi(app: Express): void {
  if (env.NODE_ENV === 'test') {
    return;
  }

  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument as unknown as Record<string, unknown>),
  );
}
