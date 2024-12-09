/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { TokenError } from 'src/exception/token.exception';
import { DBError } from 'src/exception/db.exception';

export const errorHandlingMiddleware = ((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof TokenError) {
    return res.status(401).json({ message: err.message });
  } else if (err instanceof DBError) {
    return res.status(500).json({ message: err.message });
  }
  res.status(500).json({ message: '서버 내부 에러가 발생하였습니다.' });
}) as ErrorRequestHandler;
