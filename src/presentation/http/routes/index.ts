import { Router } from 'express';
import type { TokenService } from '../../../application/ports/TokenService.js';
import type { AuthController } from '../controllers/AuthController.js';
import type { MessageController } from '../controllers/MessageController.js';
import { createAuthRouter } from './auth.routes.js';
import { createChatRouter } from './chat.routes.js';
import { createMessageRouter } from './message.routes.js';

export interface ApiRouterDependencies {
  authController: AuthController;
  messageController: MessageController;
  tokenService: TokenService;
}

export function createApiRouter(deps: ApiRouterDependencies): Router {
  const router = Router();

  router.use('/auth', createAuthRouter(deps.authController));
  router.use(
    '/messages',
    createMessageRouter(deps.messageController, deps.tokenService),
  );
  router.use(
    '/chats',
    createChatRouter(deps.messageController, deps.tokenService),
  );

  return router;
}
