export interface AccessTokenPayload {
  /** Subject: the authenticated user id. */
  sub: string;
}

export interface TokenService {
  sign(payload: AccessTokenPayload): string;
  /**
   * Verifies signature and expiry. Implementations MUST throw an
   * `UnauthorizedError` when the token is missing, malformed, or expired.
   */
  verify(token: string): AccessTokenPayload;
}
