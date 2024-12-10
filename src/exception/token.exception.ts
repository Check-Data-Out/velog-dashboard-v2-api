import { CustomError } from './coustom.exception';
export class TokenError extends CustomError {
  constructor(message: string) {
    super(message, 'TOKEN_ERROR', 401);
  }
}
