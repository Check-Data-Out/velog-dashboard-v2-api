import { CustomError } from './custom.exception';

export class DBError extends CustomError {
  constructor(message: string) {
    super(message, 'DB_ERROR', 500);
  }
}
