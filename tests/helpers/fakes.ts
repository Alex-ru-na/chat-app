import { randomUUID } from 'node:crypto';
import type { PasswordHasher } from '../../src/application/ports/PasswordHasher.js';
import type {
  AccessTokenPayload,
  TokenService,
} from '../../src/application/ports/TokenService.js';
import { UnauthorizedError } from '../../src/shared/errors/AppError.js';

/**
 * Deterministic, non-cryptographic hasher for unit tests. Never use outside
 * tests — real hashing lives in `Argon2PasswordHasher`.
 */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return hash === `hashed:${plainPassword}`;
  }
}

export class FakeTokenService implements TokenService {
  sign(payload: AccessTokenPayload): string {
    return `token:${payload.sub}`;
  }

  verify(token: string): AccessTokenPayload {
    if (!token.startsWith('token:')) {
      throw new UnauthorizedError('The access token is invalid');
    }
    return { sub: token.slice('token:'.length) };
  }
}

export const newId = (): string => randomUUID();
