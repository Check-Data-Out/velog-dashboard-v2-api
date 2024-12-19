/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { CustomError } from '../exception';

export const errorHandlingMiddleware = ((err: CustomError, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CustomError) {
    return res
      .status(err.statusCode)
      .json({ success: false, message: err.message, error: { code: err.code, statusCode: err.statusCode } });
  }
  res.status(500).json({
    success: false,
    message: '서버 내부 에러가 발생하였습니다.',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    },
  });
}) as ErrorRequestHandler;
