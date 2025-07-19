/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { CustomError } from '@/exception';
import * as Sentry from '@sentry/node';
import logger from '@/configs/logger.config';

export const errorHandlingMiddleware: ErrorRequestHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof CustomError) {
    res
      .status(err.statusCode)
      .json({ success: false, message: err.message, error: { code: err.code, statusCode: err.statusCode } });
    return;
  }

  Sentry.captureException(err);
  logger.error('Internal Server Error');

  res.status(500).json({
    success: false,
    message: '서버 내부 에러가 발생하였습니다.',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    },
  });
  return;
};
