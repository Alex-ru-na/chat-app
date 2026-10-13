import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { TokenService } from '../../../application/ports/TokenService.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import type { AuthPrincipal } from '../../../shared/types/express.js';

const BEARER_PREFIX = 'Bearer ';

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * authenticated principal to the request. Rejects if the header is missing or
 * the token is invalid/expired.
 */
export function authenticate(tokenService: TokenService): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const header = req.header('authorization');

      if (!header || !header.startsWith(BEARER_PREFIX)) {
        throw new UnauthorizedError('Missing bearer token');
      }

      const token = header.slice(BEARER_PREFIX.length).trim();
      if (token.length === 0) {
        throw new UnauthorizedError('Missing bearer token');
      }

      const payload = tokenService.verify(token);
      req.auth = { userId: payload.sub };
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Guards a controller against being reached without an authenticated
 * principal. Should always succeed behind `authenticate`, but makes the
 * precondition explicit and type-safe.
 */
export function requirePrincipal(req: Request): AuthPrincipal {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth;
}
