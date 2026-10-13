import { Message } from '../entities/Message.js';

export interface NewMessage {
  senderId: string;
  recipientId: string;
  content: string;
}

/**
 * Keyset-pagination cursor. Encodes the exact position of the last item the
 * client has seen so the next page can be fetched deterministically even when
 * several messages share the same `createdAt`.
 */
export interface ConversationCursor {
  createdAt: Date;
  id: string;
}

export interface ConversationQuery {
  /** The two participants of the conversation, in any order. */
  participantA: string;
  participantB: string;
  limit: number;
  /** When present, return only messages strictly older than this position. */
  before?: ConversationCursor;
}

export interface ConversationPage {
  /** Messages in ascending chronological order (oldest first). */
  messages: Message[];
  /** True when older messages exist beyond this page. */
  hasMore: boolean;
}

export interface MessageRepository {
  save(message: NewMessage): Promise<Message>;
  findConversation(query: ConversationQuery): Promise<ConversationPage>;
}
