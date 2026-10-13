import { Router } from 'express';
import type { TokenService } from '../../../application/ports/TokenService.js';
import type { MessageController } from '../controllers/MessageController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import { validateParams, validateQuery } from '../middlewares/validate.js';
import { ConversationParamsDto } from '../validators/ConversationParamsDto.js';
import { PaginationQueryDto } from '../validators/PaginationQueryDto.js';

export function createChatRouter(
  controller: MessageController,
  tokenService: TokenService,
): Router {
  const router = Router();

  router.use(authenticate(tokenService));

  router.get(
    '/:userId/messages',
    validateParams(ConversationParamsDto),
    validateQuery(PaginationQueryDto),
    asyncHandler(controller.getConversation),
  );

  return router;
}
