import { CustomError } from './custom.exception';

export class BadRequestError extends CustomError {
  constructor(message: string, code: string = 'INVALID_SYNTAX') {
    super(message, code, 400);
  }
}
