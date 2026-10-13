import { beforeEach, describe, expect, it } from 'vitest';
import { LoginUser } from '../../../src/application/use-cases/LoginUser.js';
import { SignUpUser } from '../../../src/application/use-cases/SignUpUser.js';
import { InvalidCredentialError } from '../../../src/domain/errors/DomainError.js';
import { FakePasswordHasher, FakeTokenService } from '../../helpers/fakes.js';
import { InMemoryUserRepository } from '../../helpers/InMemoryUserRepository.js';

describe('LoginUser', () => {
  let userRepository: InMemoryUserRepository;
  let login: LoginUser;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();

    await new SignUpUser({
      userRepository,
      passwordHasher,
      tokenService,
    }).execute({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'secret123',
    });

    login = new LoginUser({ userRepository, passwordHasher, tokenService });
  });

  it('authenticates with valid credentials (case-insensitive email)', async () => {
    const { user, accessToken } = await login.execute({
      email: 'ADA@example.com',
      password: 'secret123',
    });

    expect(user.email.value).toBe('ada@example.com');
    expect(accessToken).toBe(`token:${user.id}`);
  });

  it('rejects a wrong password', async () => {
    await expect(
      login.execute({ email: 'ada@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialError);
  });

  it('rejects an unknown email with the same error', async () => {
    await expect(
      login.execute({ email: 'ghost@example.com', password: 'secret123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialError);
  });
});
