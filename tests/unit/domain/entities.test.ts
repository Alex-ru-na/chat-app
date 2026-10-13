import { describe, expect, it } from 'vitest';
import { Message } from '../../../src/domain/entities/Message.js';
import { User } from '../../../src/domain/entities/User.js';
import {
  InvalidNameError,
  SelfMessageError,
} from '../../../src/domain/errors/DomainError.js';

describe('User business rules', () => {
  it('trims a valid name', () => {
    expect(User.validateName('  Ada  ')).toBe('Ada');
  });

  it('rejects an empty name', () => {
    expect(() => User.validateName('   ')).toThrow(InvalidNameError);
  });

  it('rejects a name longer than 120 characters', () => {
    expect(() => User.validateName('a'.repeat(121))).toThrow(InvalidNameError);
  });
});

describe('Message business rules', () => {
  it('allows distinct participants', () => {
    expect(() =>
      Message.assertDistinctParticipants('user-a', 'user-b'),
    ).not.toThrow();
  });

  it('rejects sending a message to yourself', () => {
    expect(() =>
      Message.assertDistinctParticipants('user-a', 'user-a'),
    ).toThrow(SelfMessageError);
  });
});
