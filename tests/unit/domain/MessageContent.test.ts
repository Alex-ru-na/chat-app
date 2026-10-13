import { describe, expect, it } from 'vitest';
import { InvalidMessageContentError } from '../../../src/domain/errors/DomainError.js';
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  MessageContent,
} from '../../../src/domain/value-objects/MessageContent.js';

describe('MessageContent', () => {
  it('trims surrounding whitespace', () => {
    expect(MessageContent.create('  hello  ').value).toBe('hello');
  });

  it('rejects empty and whitespace-only content', () => {
    expect(() => MessageContent.create('')).toThrow(InvalidMessageContentError);
    expect(() => MessageContent.create('    ')).toThrow(
      InvalidMessageContentError,
    );
  });

  it('rejects content longer than the maximum length', () => {
    const tooLong = 'a'.repeat(MESSAGE_CONTENT_MAX_LENGTH + 1);
    expect(() => MessageContent.create(tooLong)).toThrow(
      InvalidMessageContentError,
    );
  });

  it('accepts content exactly at the maximum length', () => {
    const max = 'a'.repeat(MESSAGE_CONTENT_MAX_LENGTH);
    expect(MessageContent.create(max).value).toHaveLength(
      MESSAGE_CONTENT_MAX_LENGTH,
    );
  });
});
