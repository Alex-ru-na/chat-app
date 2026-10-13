import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { DomainError } from '../../../domain/errors/DomainError.js';
import { AppError, type ErrorDetail } from '../../../shared/errors/AppError.js';
import { env } from '../../../infrastructure/config/env.js';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
  };
}

/**
 * Presentation-level mapping from domain error codes to HTTP statuses. The
 * domain stays transport-agnostic; only here do we decide how a business rule
 * violation is surfaced over HTTP.
 */
const DOMAIN_ERROR_STATUS: Record<string, number> = {
  INVALID_CREDENTIALS: 401,
};

function isBodyParserError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: number }).status === 400
  );
}

/**
 * Centralized error mapper. Every failure crossing the HTTP boundary is
 * normalized into the same envelope. Internal details (stack traces, driver
 * messages, secrets) are never leaked to clients.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const mapped = mapError(error);

  if (mapped.httpStatus >= 500) {
    // Unexpected failures are logged server-side only.
    console.error('[error]', error);
  }

  res.status(mapped.httpStatus).json({
    success: false,
    error: {
      code: mapped.code,
      message: mapped.message,
      details: mapped.details,
    },
  } satisfies ErrorBody);
}

interface MappedError {
  httpStatus: number;
  code: string;
  message: string;
  details: ErrorDetail[];
}

function mapError(error: unknown): MappedError {
  if (error instanceof AppError) {
    return {
      httpStatus: error.httpStatus,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof DomainError) {
    // Domain invariants violated by input → 400 by default, unless the code
    // has a specific transport meaning (e.g. bad credentials → 401).
    return {
      httpStatus: DOMAIN_ERROR_STATUS[error.code] ?? 400,
      code: error.code,
      message: error.message,
      details: [],
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return {
        httpStatus: 409,
        code: 'CONFLICT',
        message: 'The resource already exists',
        details: [],
      };
    }
    if (error.code === 'P2025') {
      return {
        httpStatus: 404,
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
        details: [],
      };
    }
  }

  if (isBodyParserError(error)) {
    return {
      httpStatus: 400,
      code: 'INVALID_JSON',
      message: 'The request body is not valid JSON',
      details: [],
    };
  }

  return {
    httpStatus: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message:
      env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error instanceof Error
          ? error.message
          : 'An unexpected error occurred',
    details: [],
  };
}
