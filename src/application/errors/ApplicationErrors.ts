import { AppError } from '../../shared/errors/AppError.js';

export class EmailAlreadyInUseError extends AppError {
  constructor() {
    super(
      'EMAIL_ALREADY_IN_USE',
      'An account with this email already exists',
      409,
    );
  }
}

export class RecipientNotFoundError extends AppError {
  constructor() {
    super('RECIPIENT_NOT_FOUND', 'The recipient does not exist', 404);
  }
}
