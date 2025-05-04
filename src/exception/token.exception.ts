import { CustomError } from './custom.exception';
import { BadRequestError } from './badRequest.exception';
import { UnauthorizedError } from './unauthorized.exception';

export class TokenError extends CustomError {
  constructor(message: string) {
    super(message, 'TOKEN_ERROR', 401);
  }
}

export class TokenExpiredError extends UnauthorizedError {
  constructor(message = '토큰이 만료되었습니다') {
    super(message, 'TOKEN_EXPIRED');
  }
}

export class InvalidTokenError extends UnauthorizedError {
  constructor(message = '유효하지 않은 토큰입니다') {
    super(message, 'INVALID_TOKEN');
  }
}

/* ===================================================
아래 부터는 QRToken 에 관한 에러
=================================================== */

export class QRTokenExpiredError extends BadRequestError {
  constructor(message = 'QR 토큰이 만료되었습니다') {
    super(message, 'TOKEN_EXPIRED');
  }
}

export class QRTokenInvalidError extends BadRequestError {
  constructor(message = '유효하지 않은 QR 토큰입니다') {
    super(message, 'INVALID_TOKEN');
  }
}
