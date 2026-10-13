import { InvalidEmailError } from '../errors/DomainError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/**
 * Value object representing a normalized (trimmed, lower-cased) email address.
 * Normalization guarantees the uniqueness check for accounts is case-insensitive.
 */
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();

    if (normalized.length === 0 || normalized.length > MAX_EMAIL_LENGTH) {
      throw new InvalidEmailError(raw);
    }
    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailError(raw);
    }

    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
