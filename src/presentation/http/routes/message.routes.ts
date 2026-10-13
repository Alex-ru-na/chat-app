import { Router } from 'express';
import type { TokenService } from '../../../application/ports/TokenService.js';
import type { MessageController } from '../controllers/MessageController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { SendMessageDto } from '../validators/SendMessageDto.js';

export function createMessageRouter(
  controller: MessageController,
  tokenService: TokenService,
): Router {
  const router = Router();

  router.use(authenticate(tokenService));

  router.post('/', validateBody(SendMessageDto), asyncHandler(controller.send));

  return router;
}
