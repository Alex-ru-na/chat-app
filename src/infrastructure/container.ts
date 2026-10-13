import { GetConversationMessages } from '../application/use-cases/GetConversationMessages.js';
import { LoginUser } from '../application/use-cases/LoginUser.js';
import { SendMessage } from '../application/use-cases/SendMessage.js';
import { SignUpUser } from '../application/use-cases/SignUpUser.js';
import { AuthController } from '../presentation/http/controllers/AuthController.js';
import { MessageController } from '../presentation/http/controllers/MessageController.js';
import type { PasswordHasher } from '../application/ports/PasswordHasher.js';
import type { TokenService } from '../application/ports/TokenService.js';
import type { MessageRepository } from '../domain/repositories/MessageRepository.js';
import type { UserRepository } from '../domain/repositories/UserRepository.js';
import { PrismaMessageRepository } from './repositories/PrismaMessageRepository.js';
import { PrismaUserRepository } from './repositories/PrismaUserRepository.js';
import { Argon2PasswordHasher } from './security/Argon2PasswordHasher.js';
import { JwtTokenService } from './security/JwtTokenService.js';

export interface Container {
  repositories: {
    userRepository: UserRepository;
    messageRepository: MessageRepository;
  };
  services: {
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
  };
  useCases: {
    signUpUser: SignUpUser;
    loginUser: LoginUser;
    sendMessage: SendMessage;
    getConversationMessages: GetConversationMessages;
  };
  controllers: {
    authController: AuthController;
    messageController: MessageController;
  };
}

/**
 * Explicit composition root. Concrete adapters are wired to ports here and
 * nowhere else, so the rest of the code depends only on abstractions. No
 * service locator, no global mutable registry.
 */
export function buildContainer(): Container {
  const userRepository = new PrismaUserRepository();
  const messageRepository = new PrismaMessageRepository();
  const passwordHasher = new Argon2PasswordHasher();
  const tokenService = new JwtTokenService();

  const signUpUser = new SignUpUser({
    userRepository,
    passwordHasher,
    tokenService,
  });
  const loginUser = new LoginUser({
    userRepository,
    passwordHasher,
    tokenService,
  });
  const sendMessage = new SendMessage({ messageRepository, userRepository });
  const getConversationMessages = new GetConversationMessages({
    messageRepository,
    userRepository,
  });

  const authController = new AuthController({ signUpUser, loginUser });
  const messageController = new MessageController({
    sendMessage,
    getConversationMessages,
  });

  return {
    repositories: { userRepository, messageRepository },
    services: { passwordHasher, tokenService },
    useCases: { signUpUser, loginUser, sendMessage, getConversationMessages },
    controllers: { authController, messageController },
  };
}

export type { UserRepository, MessageRepository, PasswordHasher, TokenService };
