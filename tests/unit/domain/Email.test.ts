import { describe, expect, it } from 'vitest';
import { InvalidEmailError } from '../../../src/domain/errors/DomainError.js';
import { Email } from '../../../src/domain/value-objects/Email.js';

describe('Email', () => {
  it('normalizes by trimming and lower-casing', () => {
    const email = Email.create('  Ada.Lovelace@Example.COM  ');
    expect(email.value).toBe('ada.lovelace@example.com');
  });

  it('treats differently-cased emails as equal', () => {
    expect(Email.create('a@b.com').equals(Email.create('A@B.com'))).toBe(true);
  });

  it.each(['', '   ', 'no-at-sign', 'a@b', 'a@b.', '@b.com'])(
    'rejects invalid email "%s"',
    (value) => {
      expect(() => Email.create(value)).toThrow(InvalidEmailError);
    },
  );

  it('rejects emails longer than 254 characters', () => {
    const long = `${'a'.repeat(250)}@b.com`;
    expect(() => Email.create(long)).toThrow(InvalidEmailError);
  });
});
