export type ErrorDetail = {
  field?: string;
  code?: string;
  message: string;
};

/**
 * Base application error. Carries a stable machine-readable `code` and the
 * HTTP status the presentation layer should translate it to. Application and
 * infrastructure layers may throw these; the domain layer must not (it throws
 * `DomainError` instead, keeping it free of transport concerns).
 */
export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details: ErrorDetail[];
  readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    httpStatus = 500,
    details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationAppError extends AppError {
  constructor(
    message = 'The request contains invalid data',
    details: ErrorDetail[] = [],
  ) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to perform this action') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The resource already exists') {
    super('CONFLICT', message, 409);
  }
}
