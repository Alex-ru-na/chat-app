import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationAppError } from '../../shared/errors/AppError.js';

type ClassConstructor<T> = new () => T;

/**
 * Validates a Socket.IO payload using the same `class-validator` DTOs as the
 * REST layer, so the rules are declared once. Throws `ValidationAppError`,
 * which the socket handler turns into a `message:error` event.
 */
export async function validateSocketPayload<T extends object>(
  DtoClass: ClassConstructor<T>,
  payload: unknown,
): Promise<T> {
  const instance = plainToInstance(DtoClass, payload, {
    enableImplicitConversion: false,
  });

  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });

  if (errors.length > 0) {
    const details = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}).map((message) => ({
        field: error.property,
        code: 'invalid',
        message,
      })),
    );
    throw new ValidationAppError('The socket payload is invalid', details);
  }

  return instance;
}
