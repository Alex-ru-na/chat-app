import { InvalidNameError } from '../errors/DomainError.js';
import { Email } from '../value-objects/Email.js';

const NAME_MAX_LENGTH = 120;

export interface UserProps {
  id: string;
  name: string;
  email: Email;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate root representing a registered account. Passwords are only ever
 * held as an already-hashed string; the entity never sees a plain password.
 */
export class User {
  private constructor(private readonly props: UserProps) {}

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  /** Validates the business rules for a brand new user. */
  static validateName(name: string): string {
    const trimmed = name?.trim() ?? '';
    if (trimmed.length === 0 || trimmed.length > NAME_MAX_LENGTH) {
      throw new InvalidNameError();
    }
    return trimmed;
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
