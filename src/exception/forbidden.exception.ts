import { CustomError } from './custom.exception';

export class ForbiddenError extends CustomError {
  constructor(message: string, code: string = 'FORBIDDEN') {
    super(message, code, 403);
  }
}
