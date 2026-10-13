export interface AuthPrincipal {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Populated by the authentication middleware for protected routes. */
      auth?: AuthPrincipal;
    }
  }
}

export {};
