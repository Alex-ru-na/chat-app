import type { Request, Response } from 'express';
import { LoginUser } from '../../../application/use-cases/LoginUser.js';
import { SignUpUser } from '../../../application/use-cases/SignUpUser.js';
import type { ApiSuccess } from '../../../shared/types/ApiResponse.js';
import {
  toUserResponse,
  type UserResponse,
} from '../mappers/responseMappers.js';
import type { LoginDto } from '../validators/LoginDto.js';
import type { SignUpDto } from '../validators/SignUpDto.js';

interface AuthResultData {
  user: UserResponse;
  accessToken: string;
}

export interface AuthControllerDependencies {
  signUpUser: SignUpUser;
  loginUser: LoginUser;
}

/** Thin HTTP adapter: maps request ⇄ use cases. No business logic here. */
export class AuthController {
  constructor(private readonly deps: AuthControllerDependencies) {}

  signUp = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as SignUpDto;

    const { user, accessToken } = await this.deps.signUpUser.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });

    const body: ApiSuccess<AuthResultData> = {
      success: true,
      data: { user: toUserResponse(user), accessToken },
    };

    res.status(201).json(body);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as LoginDto;

    const { user, accessToken } = await this.deps.loginUser.execute({
      email: dto.email,
      password: dto.password,
    });

    const body: ApiSuccess<AuthResultData> = {
      success: true,
      data: { user: toUserResponse(user), accessToken },
    };

    res.status(200).json(body);
  };
}
