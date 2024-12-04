import { Request, Response, NextFunction } from 'express';
import logger from 'src/configs/logger.config';

export const errorHandlingMiddleware = (err: Express.CustomError, req: Request, res: Response, next: NextFunction) => {
  logger.error({ message: err.message, code: err.code, path: req.path });
  res.status(err.code || 500).json({ message: err.message, code: err.code || 500 });
  next();
};