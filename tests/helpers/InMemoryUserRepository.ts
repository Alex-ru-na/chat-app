import { randomUUID } from 'node:crypto';
import { EmailAlreadyInUseError } from '../../src/application/errors/ApplicationErrors.js';
import { User } from '../../src/domain/entities/User.js';
import type {
  NewUser,
  UserRepository,
} from '../../src/domain/repositories/UserRepository.js';
import { Email } from '../../src/domain/value-objects/Email.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async save(user: NewUser): Promise<User> {
    const duplicate = await this.findByEmail(user.email);
    if (duplicate) {
      throw new EmailAlreadyInUseError();
    }

    const now = new Date();
    const created = User.reconstitute({
      id: randomUUID(),
      name: user.name,
      email: Email.create(user.email),
      passwordHash: user.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    this.users.set(created.id, created);
    return created;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.value === email) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async existsById(id: string): Promise<boolean> {
    return this.users.has(id);
  }
}
