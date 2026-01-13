/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { CustomError, InvalidTokenError } from '@/exception';
import * as Sentry from '@sentry/node';
import { logError } from '@/utils/logging.util';
import { AuthRateLimitService } from '@/services/authRateLimit.service';

export const createErrorHandlingMiddleware = (authRateLimitService?: AuthRateLimitService): ErrorRequestHandler => {
  return async (err: Error, req: Request, res: Response, next: NextFunction) => {
    // InvalidTokenError 발생 시 인증 실패 추적
    if (err instanceof InvalidTokenError && authRateLimitService) {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      await authRateLimitService.trackAuthFailure(ip);
    }

    if (err instanceof CustomError) {
      res.status(err.statusCode);
      logError(req, res, err, `Custom Error: ${err.message}`);

      res.json({ success: false, message: err.message, error: { code: err.code, statusCode: err.statusCode } });
      return;
    }

    // Sentry에 에러 전송
    Sentry.captureException(err);

    res.status(500);
    logError(req, res, err, 'Internal Server Error');

    res.json({
      success: false,
      message: '서버 내부 에러가 발생하였습니다.',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
      },
    });
    return;
  };
};

// 하위 호환성을 위한 기존 export
export const errorHandlingMiddleware: ErrorRequestHandler = createErrorHandlingMiddleware();
