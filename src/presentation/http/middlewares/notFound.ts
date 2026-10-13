import type { Request, Response } from 'express';
import { NotFoundError } from '../../../shared/errors/AppError.js';

export function notFoundHandler(_req: Request, _res: Response): never {
  throw new NotFoundError('The requested route does not exist');
}
