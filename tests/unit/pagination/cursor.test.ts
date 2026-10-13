import { describe, expect, it } from 'vitest';
import {
  decodeCursor,
  encodeCursor,
} from '../../../src/shared/pagination/cursor.js';

describe('cursor encoding', () => {
  it('round-trips a valid cursor', () => {
    const original = {
      createdAt: new Date('2024-01-02T03:04:05.678Z'),
      id: 'abc',
    };
    const decoded = decodeCursor(encodeCursor(original));

    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe('abc');
    expect(decoded?.createdAt.toISOString()).toBe(
      original.createdAt.toISOString(),
    );
  });

  it('returns null for garbage input', () => {
    expect(decodeCursor('not-base64-!!')).toBeNull();
  });

  it('returns null when the payload shape is wrong', () => {
    const bad = Buffer.from(JSON.stringify({ foo: 'bar' })).toString(
      'base64url',
    );
    expect(decodeCursor(bad)).toBeNull();
  });
});
