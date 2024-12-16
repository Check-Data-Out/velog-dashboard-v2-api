import { CustomError } from './custom.exception';

export class UnauthorizedError extends CustomError {
  constructor(message: string, code: string = 'UNAUTHORIZED') {
    super(message, code, 401);
  }
}
