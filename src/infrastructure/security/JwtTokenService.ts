import jwt, { type SignOptions } from 'jsonwebtoken';
import type {
  AccessTokenPayload,
  TokenService,
} from '../../application/ports/TokenService.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import { env } from '../config/env.js';

export class JwtTokenService implements TokenService {
  private readonly secret: string;
  private readonly expiresIn: SignOptions['expiresIn'];

  constructor() {
    this.secret = env.JWT_SECRET;
    this.expiresIn = env.JWT_EXPIRES_IN as SignOptions['expiresIn'];
  }

  sign(payload: AccessTokenPayload): string {
    return jwt.sign({ sub: payload.sub }, this.secret, {
      expiresIn: this.expiresIn,
    });
  }

  verify(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);

      if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
        throw new UnauthorizedError('The access token is invalid');
      }

      return { sub: decoded.sub };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('The access token is invalid or expired');
    }
  }
}
