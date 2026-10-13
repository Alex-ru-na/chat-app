import type { Message } from '../../../domain/entities/Message.js';
import type { User } from '../../../domain/entities/User.js';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

/**
 * Maps a domain `User` to its public representation. Deliberately omits
 * `passwordHash` (and any other internal field) so it can never leak.
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    senderId: message.senderId,
    recipientId: message.recipientId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}
