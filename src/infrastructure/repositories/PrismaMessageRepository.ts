import type { Message as PrismaMessage } from '@prisma/client';
import { Message } from '../../domain/entities/Message.js';
import type {
  ConversationPage,
  ConversationQuery,
  MessageRepository,
  NewMessage,
} from '../../domain/repositories/MessageRepository.js';
import { prisma } from '../database/prisma.js';

function toDomain(row: PrismaMessage): Message {
  return Message.reconstitute({
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    content: row.content,
    createdAt: row.createdAt,
  });
}

export class PrismaMessageRepository implements MessageRepository {
  async save(message: NewMessage): Promise<Message> {
    const created = await prisma.message.create({
      data: {
        senderId: message.senderId,
        recipientId: message.recipientId,
        content: message.content,
      },
    });
    return toDomain(created);
  }

  async findConversation(query: ConversationQuery): Promise<ConversationPage> {
    const { participantA, participantB, limit, before } = query;

    const participants = {
      OR: [
        { senderId: participantA, recipientId: participantB },
        { senderId: participantB, recipientId: participantA },
      ],
    };

    // Keyset condition: strictly "older than" the cursor, using (createdAt, id)
    // as a tie-breaker so equal timestamps never reorder or skip messages.
    const olderThanCursor = before
      ? {
          OR: [
            { createdAt: { lt: before.createdAt } },
            { createdAt: before.createdAt, id: { lt: before.id } },
          ],
        }
      : undefined;

    const rows = await prisma.message.findMany({
      where: {
        AND: olderThanCursor ? [participants, olderThanCursor] : [participants],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      // Repository returns ascending chronological order (oldest first).
      messages: page.reverse().map(toDomain),
      hasMore,
    };
  }
}
