/**
 * Base class for every business-rule violation raised from the domain layer.
 * It exposes a stable `code` so the presentation layer can map it to an HTTP
 * response without the domain knowing anything about HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class InvalidEmailError extends DomainError {
  readonly code = 'INVALID_EMAIL';
  constructor(value: string) {
    super(`"${value}" is not a valid email address`);
  }
}

export class InvalidNameError extends DomainError {
  readonly code = 'INVALID_NAME';
  constructor() {
    super('Name must be between 1 and 120 characters');
  }
}

export class InvalidMessageContentError extends DomainError {
  readonly code = 'INVALID_MESSAGE_CONTENT';
  constructor(reason: string) {
    super(`Invalid message content: ${reason}`);
  }
}

export class SelfMessageError extends DomainError {
  readonly code = 'SELF_MESSAGE';
  constructor() {
    super('A user cannot send a message to themselves');
  }
}

export class InvalidCredentialError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('The email or password is incorrect');
  }
}
