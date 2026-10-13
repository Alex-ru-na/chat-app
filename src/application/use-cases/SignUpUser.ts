import { User } from '../../domain/entities/User.js';
import { EmailAlreadyInUseError } from '../errors/ApplicationErrors.js';
import type { PasswordHasher } from '../ports/PasswordHasher.js';
import type { TokenService } from '../ports/TokenService.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { Email } from '../../domain/value-objects/Email.js';

export interface SignUpUserInput {
  name: string;
  email: string;
  password: string;
}

export interface SignUpUserOutput {
  user: User;
  accessToken: string;
}

export interface SignUpUserDependencies {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

export class SignUpUser {
  constructor(private readonly deps: SignUpUserDependencies) {}

  async execute(input: SignUpUserInput): Promise<SignUpUserOutput> {
    const { userRepository, passwordHasher, tokenService } = this.deps;

    const name = User.validateName(input.name);
    const email = Email.create(input.email);

    const existing = await userRepository.findByEmail(email.value);
    if (existing) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await passwordHasher.hash(input.password);

    const user = await userRepository.save({
      name,
      email: email.value,
      passwordHash,
    });

    const accessToken = tokenService.sign({ sub: user.id });

    return { user, accessToken };
  }
}
