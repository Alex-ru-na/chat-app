import type { Message } from '../../domain/entities/Message.js';
import type { MessageRepository } from '../../domain/repositories/MessageRepository.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../../shared/errors/AppError.js';
import { decodeCursor, encodeCursor } from '../../shared/pagination/cursor.js';

export interface GetConversationMessagesInput {
  requesterId: string;
  otherUserId: string;
  limit: number;
  cursor?: string;
}

export interface GetConversationMessagesOutput {
  messages: Message[];
  /** Opaque cursor for the next (older) page, or null when exhausted. */
  nextCursor: string | null;
}

export interface GetConversationMessagesDependencies {
  messageRepository: MessageRepository;
  userRepository: UserRepository;
}

/**
 * Reads a page of the conversation between the requester and another user.
 * Authorization is inherent: the requester can only ever ask for a
 * conversation they are a participant of, because the query is always built
 * from `requesterId`.
 */
export class GetConversationMessages {
  constructor(private readonly deps: GetConversationMessagesDependencies) {}

  async execute(
    input: GetConversationMessagesInput,
  ): Promise<GetConversationMessagesOutput> {
    const { messageRepository, userRepository } = this.deps;

    if (input.requesterId === input.otherUserId) {
      throw new ForbiddenError('You cannot open a conversation with yourself');
    }

    const otherUserExists = await userRepository.existsById(input.otherUserId);
    if (!otherUserExists) {
      throw new NotFoundError('The requested conversation does not exist');
    }

    let before;
    if (input.cursor !== undefined) {
      const decoded = decodeCursor(input.cursor);
      if (!decoded) {
        throw new ValidationAppError('The pagination cursor is invalid', [
          {
            field: 'cursor',
            code: 'invalid_cursor',
            message: 'Invalid cursor',
          },
        ]);
      }
      before = decoded;
    }

    const page = await messageRepository.findConversation({
      participantA: input.requesterId,
      participantB: input.otherUserId,
      limit: input.limit,
      ...(before ? { before } : {}),
    });

    const oldest = page.messages[0];
    const nextCursor =
      page.hasMore && oldest
        ? encodeCursor({ createdAt: oldest.createdAt, id: oldest.id })
        : null;

    return { messages: page.messages, nextCursor };
  }
}
