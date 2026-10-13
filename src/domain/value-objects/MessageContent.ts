import { InvalidMessageContentError } from '../errors/DomainError.js';

export const MESSAGE_CONTENT_MAX_LENGTH = 2000;

/**
 * Value object for the body of a text message. The invariant enforced here is
 * the single source of truth for what a valid message is, reused by both the
 * REST and the Socket.IO entry points.
 */
export class MessageContent {
  private constructor(public readonly value: string) {}

  static create(raw: string): MessageContent {
    if (typeof raw !== 'string') {
      throw new InvalidMessageContentError('content must be a string');
    }

    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      throw new InvalidMessageContentError('content must not be empty');
    }
    if (trimmed.length > MESSAGE_CONTENT_MAX_LENGTH) {
      throw new InvalidMessageContentError(
        `content must be at most ${MESSAGE_CONTENT_MAX_LENGTH} characters`,
      );
    }

    return new MessageContent(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
