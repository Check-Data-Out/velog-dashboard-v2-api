import { Request, Response, NextFunction } from 'express';
import logger from '../configs/logger.config';
import { TokenError } from 'src/exception/token.exception';
import { DBError } from 'src/exception/db.exception';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandlingMiddleware = (err: Express.CustomError, req: Request, res: Response, next: NextFunction) => {
  logger.error({ message: err.message, code: err.code, path: req.path });

  if (err instanceof TokenError) {
    return res.status(401).json({ message: err.message });
  } else if (err instanceof DBError) {
    return res.status(500).json({ message: err.message });
  }
  return res.status(err.code || 500).json({ message: err.message, code: err.code || 500 });
};
