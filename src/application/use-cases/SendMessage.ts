import { Message } from '../../domain/entities/Message.js';
import { MessageContent } from '../../domain/value-objects/MessageContent.js';
import type { MessageRepository } from '../../domain/repositories/MessageRepository.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { RecipientNotFoundError } from '../errors/ApplicationErrors.js';

export interface SendMessageInput {
  /** Derived from the authenticated principal, never from the request body. */
  senderId: string;
  recipientId: string;
  content: string;
}

export interface SendMessageOutput {
  message: Message;
}

export interface SendMessageDependencies {
  messageRepository: MessageRepository;
  userRepository: UserRepository;
}

/**
 * Persists a message. This use case is shared by the REST controller and the
 * Socket.IO handler so the rules (and the persistence guarantee) live in one
 * place. The message is fully saved before the caller is allowed to notify the
 * recipient.
 */
export class SendMessage {
  constructor(private readonly deps: SendMessageDependencies) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    const { messageRepository, userRepository } = this.deps;

    Message.assertDistinctParticipants(input.senderId, input.recipientId);

    const content = MessageContent.create(input.content);

    const recipientExists = await userRepository.existsById(input.recipientId);
    if (!recipientExists) {
      throw new RecipientNotFoundError();
    }

    const message = await messageRepository.save({
      senderId: input.senderId,
      recipientId: input.recipientId,
      content: content.value,
    });

    return { message };
  }
}
