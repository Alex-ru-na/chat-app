import argon2 from 'argon2';
import type { PasswordHasher } from '../../application/ports/PasswordHasher.js';
import { env } from '../config/env.js';

/**
 * Argon2id password hasher. Uses memory-hard parameters, which makes offline
 * brute-force attacks significantly more expensive than with bcrypt.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  };

  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, this.options);
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      // A malformed/foreign hash is simply a failed match, never a crash.
      return false;
    }
  }
}
