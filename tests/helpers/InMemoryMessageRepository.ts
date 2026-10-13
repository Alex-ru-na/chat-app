import { randomUUID } from 'node:crypto';
import { Message } from '../../src/domain/entities/Message.js';
import type {
  ConversationPage,
  ConversationQuery,
  MessageRepository,
  NewMessage,
} from '../../src/domain/repositories/MessageRepository.js';

interface StoredMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
}

/**
 * In-memory implementation of the `MessageRepository` port. Mirrors the
 * keyset-pagination semantics of the Prisma adapter so use-case tests can run
 * without a database.
 */
export class InMemoryMessageRepository implements MessageRepository {
  private readonly messages: StoredMessage[] = [];
  private sequence = 0;

  async save(message: NewMessage): Promise<Message> {
    this.sequence += 1;
    const stored: StoredMessage = {
      id: randomUUID(),
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      // Monotonic timestamp so ordering is deterministic in tests.
      createdAt: new Date(1_700_000_000_000 + this.sequence),
    };
    this.messages.push(stored);

    return Message.reconstitute(stored);
  }

  async findConversation(query: ConversationQuery): Promise<ConversationPage> {
    const { participantA, participantB, limit, before } = query;

    const isInConversation = (m: StoredMessage): boolean =>
      (m.senderId === participantA && m.recipientId === participantB) ||
      (m.senderId === participantB && m.recipientId === participantA);

    const isOlderThanCursor = (m: StoredMessage): boolean => {
      if (!before) {
        return true;
      }
      const sameInstant = m.createdAt.getTime() === before.createdAt.getTime();
      return (
        m.createdAt.getTime() < before.createdAt.getTime() ||
        (sameInstant && m.id < before.id)
      );
    };

    const ordered = this.messages
      .filter((m) => isInConversation(m) && isOlderThanCursor(m))
      .sort((a, b) => {
        const diff = b.createdAt.getTime() - a.createdAt.getTime();
        return diff !== 0 ? diff : b.id.localeCompare(a.id);
      });

    const hasMore = ordered.length > limit;
    const page = hasMore ? ordered.slice(0, limit) : ordered;

    return {
      messages: page.reverse().map((m) => Message.reconstitute(m)),
      hasMore,
    };
  }
}
