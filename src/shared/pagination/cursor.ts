import type { ConversationCursor } from '../../domain/repositories/MessageRepository.js';

interface EncodedCursor {
  c: string;
  i: string;
}

export function encodeCursor(cursor: ConversationCursor): string {
  const payload: EncodedCursor = {
    c: cursor.createdAt.toISOString(),
    i: cursor.id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * Decodes an opaque cursor. Returns `null` for anything that is not a valid,
 * well-formed cursor so callers can decide how to react (the HTTP validator
 * turns a null into a 400).
 */
export function decodeCursor(raw: string): ConversationCursor | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<EncodedCursor>;

    if (typeof parsed.c !== 'string' || typeof parsed.i !== 'string') {
      return null;
    }

    const createdAt = new Date(parsed.c);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return { createdAt, id: parsed.i };
  } catch {
    return null;
  }
}
