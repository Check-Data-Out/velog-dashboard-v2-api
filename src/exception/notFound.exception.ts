import { CustomError } from './custom.exception';

export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(message, 'NOT_FOUND_ERROR', 404);
  }
}
