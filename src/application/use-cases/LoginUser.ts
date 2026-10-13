import { User } from '../../domain/entities/User.js';
import { InvalidCredentialError } from '../../domain/errors/DomainError.js';
import { Email } from '../../domain/value-objects/Email.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import type { PasswordHasher } from '../ports/PasswordHasher.js';
import type { TokenService } from '../ports/TokenService.js';

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserOutput {
  user: User;
  accessToken: string;
}

export interface LoginUserDependencies {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

export class LoginUser {
  constructor(private readonly deps: LoginUserDependencies) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const { userRepository, passwordHasher, tokenService } = this.deps;

    const email = Email.create(input.email);
    const user = await userRepository.findByEmail(email.value);

    const passwordMatches =
      user !== null &&
      (await passwordHasher.verify(user.passwordHash, input.password));

    if (!user || !passwordMatches) {
      // Same error for "unknown email" and "wrong password" to avoid leaking
      // which accounts exist.
      throw new InvalidCredentialError();
    }

    const accessToken = tokenService.sign({ sub: user.id });

    return { user, accessToken };
  }
}
