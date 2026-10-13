import { Prisma, type User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/User.js';
import type {
  NewUser,
  UserRepository,
} from '../../domain/repositories/UserRepository.js';
import { Email } from '../../domain/value-objects/Email.js';
import { EmailAlreadyInUseError } from '../../application/errors/ApplicationErrors.js';
import { prisma } from '../database/prisma.js';

function toDomain(row: PrismaUser): User {
  return User.reconstitute({
    id: row.id,
    name: row.name,
    email: Email.create(row.email),
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export class PrismaUserRepository implements UserRepository {
  async save(user: NewUser): Promise<User> {
    try {
      const created = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
        },
      });
      return toDomain(created);
    } catch (error) {
      // The unique index on `email` is the authoritative guard against
      // duplicate accounts, closing the race left open by the pre-check.
      if (isUniqueConstraintViolation(error)) {
        throw new EmailAlreadyInUseError();
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { id } });
    return count > 0;
  }
}
