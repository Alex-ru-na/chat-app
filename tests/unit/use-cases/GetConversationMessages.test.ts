import { beforeEach, describe, expect, it } from 'vitest';
import { GetConversationMessages } from '../../../src/application/use-cases/GetConversationMessages.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../../../src/shared/errors/AppError.js';
import { InMemoryMessageRepository } from '../../helpers/InMemoryMessageRepository.js';
import { InMemoryUserRepository } from '../../helpers/InMemoryUserRepository.js';

describe('GetConversationMessages', () => {
  let messageRepository: InMemoryMessageRepository;
  let userRepository: InMemoryUserRepository;
  let useCase: GetConversationMessages;
  let alice: string;
  let bob: string;
  let carol: string;

  beforeEach(async () => {
    messageRepository = new InMemoryMessageRepository();
    userRepository = new InMemoryUserRepository();
    useCase = new GetConversationMessages({
      messageRepository,
      userRepository,
    });

    alice = (
      await userRepository.save({
        name: 'Alice',
        email: 'alice@example.com',
        passwordHash: 'h',
      })
    ).id;
    bob = (
      await userRepository.save({
        name: 'Bob',
        email: 'bob@example.com',
        passwordHash: 'h',
      })
    ).id;
    carol = (
      await userRepository.save({
        name: 'Carol',
        email: 'carol@example.com',
        passwordHash: 'h',
      })
    ).id;

    // 5 messages in the Alice <-> Bob conversation (alternating directions).
    for (let i = 1; i <= 5; i += 1) {
      await messageRepository.save({
        senderId: i % 2 === 0 ? bob : alice,
        recipientId: i % 2 === 0 ? alice : bob,
        content: `message ${i}`,
      });
    }
    // A message between Alice and Carol must never leak into the A<->B chat.
    await messageRepository.save({
      senderId: alice,
      recipientId: carol,
      content: 'secret for carol',
    });
  });

  it('returns the newest page in chronological order', async () => {
    const result = await useCase.execute({
      requesterId: alice,
      otherUserId: bob,
      limit: 3,
    });

    expect(result.messages.map((m) => m.content)).toEqual([
      'message 3',
      'message 4',
      'message 5',
    ]);
    expect(result.nextCursor).not.toBeNull();
  });

  it('paginates to older messages using the cursor', async () => {
    const firstPage = await useCase.execute({
      requesterId: alice,
      otherUserId: bob,
      limit: 3,
    });

    const secondPage = await useCase.execute({
      requesterId: alice,
      otherUserId: bob,
      limit: 3,
      cursor: firstPage.nextCursor as string,
    });

    expect(secondPage.messages.map((m) => m.content)).toEqual([
      'message 1',
      'message 2',
    ]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('never includes messages from other conversations', async () => {
    const result = await useCase.execute({
      requesterId: alice,
      otherUserId: bob,
      limit: 50,
    });

    expect(result.messages.map((m) => m.content)).not.toContain(
      'secret for carol',
    );
  });

  it('rejects opening a conversation with yourself', async () => {
    await expect(
      useCase.execute({ requesterId: alice, otherUserId: alice, limit: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('returns 404 when the other user does not exist', async () => {
    await expect(
      useCase.execute({
        requesterId: alice,
        otherUserId: '00000000-0000-0000-0000-000000000000',
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects a malformed cursor', async () => {
    await expect(
      useCase.execute({
        requesterId: alice,
        otherUserId: bob,
        limit: 10,
        cursor: 'this-is-not-a-valid-cursor',
      }),
    ).rejects.toBeInstanceOf(ValidationAppError);
  });
});
