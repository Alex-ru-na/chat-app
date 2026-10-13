import { beforeEach, describe, expect, it } from 'vitest';
import { RecipientNotFoundError } from '../../../src/application/errors/ApplicationErrors.js';
import { SendMessage } from '../../../src/application/use-cases/SendMessage.js';
import {
  InvalidMessageContentError,
  SelfMessageError,
} from '../../../src/domain/errors/DomainError.js';
import { InMemoryMessageRepository } from '../../helpers/InMemoryMessageRepository.js';
import { InMemoryUserRepository } from '../../helpers/InMemoryUserRepository.js';

describe('SendMessage', () => {
  let messageRepository: InMemoryMessageRepository;
  let userRepository: InMemoryUserRepository;
  let useCase: SendMessage;
  let senderId: string;
  let recipientId: string;

  beforeEach(async () => {
    messageRepository = new InMemoryMessageRepository();
    userRepository = new InMemoryUserRepository();
    useCase = new SendMessage({ messageRepository, userRepository });

    const sender = await userRepository.save({
      name: 'Sender',
      email: 'sender@example.com',
      passwordHash: 'h',
    });
    const recipient = await userRepository.save({
      name: 'Recipient',
      email: 'recipient@example.com',
      passwordHash: 'h',
    });

    senderId = sender.id;
    recipientId = recipient.id;
  });

  it('persists and returns the stored message', async () => {
    const { message } = await useCase.execute({
      senderId,
      recipientId,
      content: '  hello  ',
    });

    expect(message.id).toBeTruthy();
    expect(message.senderId).toBe(senderId);
    expect(message.recipientId).toBe(recipientId);
    expect(message.content).toBe('hello');
    expect(message.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a message sent to yourself', async () => {
    await expect(
      useCase.execute({ senderId, recipientId: senderId, content: 'hi' }),
    ).rejects.toBeInstanceOf(SelfMessageError);
  });

  it('rejects an unknown recipient', async () => {
    await expect(
      useCase.execute({
        senderId,
        recipientId: '00000000-0000-0000-0000-000000000000',
        content: 'hi',
      }),
    ).rejects.toBeInstanceOf(RecipientNotFoundError);
  });

  it('rejects empty content', async () => {
    await expect(
      useCase.execute({ senderId, recipientId, content: '   ' }),
    ).rejects.toBeInstanceOf(InvalidMessageContentError);
  });
});
