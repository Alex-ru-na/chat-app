import { User } from '../entities/User.js';

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * Port (driven side) for persisting and querying users. Implementations live
 * in the infrastructure layer. The domain/application never depend on Prisma,
 * SQL, or any concrete storage technology.
 */
export interface UserRepository {
  save(user: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  existsById(id: string): Promise<boolean>;
}
