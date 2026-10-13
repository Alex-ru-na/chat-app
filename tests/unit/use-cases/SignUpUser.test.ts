import { beforeEach, describe, expect, it } from 'vitest';
import { EmailAlreadyInUseError } from '../../../src/application/errors/ApplicationErrors.js';
import { SignUpUser } from '../../../src/application/use-cases/SignUpUser.js';
import {
  InvalidEmailError,
  InvalidNameError,
} from '../../../src/domain/errors/DomainError.js';
import { FakePasswordHasher, FakeTokenService } from '../../helpers/fakes.js';
import { InMemoryUserRepository } from '../../helpers/InMemoryUserRepository.js';

describe('SignUpUser', () => {
  let userRepository: InMemoryUserRepository;
  let useCase: SignUpUser;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    useCase = new SignUpUser({
      userRepository,
      passwordHasher: new FakePasswordHasher(),
      tokenService: new FakeTokenService(),
    });
  });

  it('registers a user, stores a hash and returns a token', async () => {
    const { user, accessToken } = await useCase.execute({
      name: 'Ada',
      email: 'Ada@Example.com',
      password: 'secret123',
    });

    expect(user.email.value).toBe('ada@example.com');
    expect(user.passwordHash).toBe('hashed:secret123');
    expect(user.passwordHash).not.toBe('secret123');
    expect(accessToken).toBe(`token:${user.id}`);
  });

  it('rejects duplicate emails regardless of casing', async () => {
    await useCase.execute({
      name: 'Ada',
      email: 'a@b.com',
      password: 'secret123',
    });

    await expect(
      useCase.execute({ name: 'Bob', email: 'A@B.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('rejects an invalid email before persisting', async () => {
    await expect(
      useCase.execute({ name: 'Ada', email: 'nope', password: 'secret123' }),
    ).rejects.toBeInstanceOf(InvalidEmailError);
  });

  it('rejects an empty name', async () => {
    await expect(
      useCase.execute({ name: '  ', email: 'a@b.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(InvalidNameError);
  });
});
