import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { authRateLimiter } from '../middlewares/rateLimit.js';
import { validateBody } from '../middlewares/validate.js';
import { LoginDto } from '../validators/LoginDto.js';
import { SignUpDto } from '../validators/SignUpDto.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post(
    '/signup',
    authRateLimiter,
    validateBody(SignUpDto),
    asyncHandler(controller.signUp),
  );

  router.post(
    '/login',
    authRateLimiter,
    validateBody(LoginDto),
    asyncHandler(controller.login),
  );

  return router;
}
