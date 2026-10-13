import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  ValidationAppError,
  type ErrorDetail,
} from '../../../shared/errors/AppError.js';

type ClassConstructor<T> = new () => T;
type RequestSource = 'body' | 'params' | 'query';

function flattenErrors(
  errors: ValidationError[],
  parentPath = '',
): ErrorDetail[] {
  const details: ErrorDetail[] = [];

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({ field: path, code: 'invalid', message });
      }
    }

    if (error.children && error.children.length > 0) {
      details.push(...flattenErrors(error.children, path));
    }
  }

  return details;
}

function validateSource<T extends object>(
  DtoClass: ClassConstructor<T>,
  source: RequestSource,
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const instance = plainToInstance(DtoClass, req[source], {
      enableImplicitConversion: false,
    });

    validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
    })
      .then((errors) => {
        if (errors.length > 0) {
          const details = flattenErrors(errors);
          next(
            new ValidationAppError(
              'The request contains invalid data',
              details,
            ),
          );
          return;
        }

        // Replace the raw input with the sanitized, typed instance so the
        // controller and use cases only ever see validated values.
        Object.assign(req, { [source]: instance });
        next();
      })
      .catch(next);
  };
}

export const validateBody = <T extends object>(Dto: ClassConstructor<T>) =>
  validateSource(Dto, 'body');

export const validateParams = <T extends object>(Dto: ClassConstructor<T>) =>
  validateSource(Dto, 'params');

export const validateQuery = <T extends object>(Dto: ClassConstructor<T>) =>
  validateSource(Dto, 'query');
