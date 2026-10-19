import { CustomError } from './custom.exception';

export class ServiceUnavailableError extends CustomError {
  constructor(message: string, code: string = 'SERVICE_UNAVAILABLE') {
    super(message, code, 503);
  }
}
