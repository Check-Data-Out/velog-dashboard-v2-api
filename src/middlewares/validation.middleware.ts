import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateResponse = (dtoClass: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dtoObject = plainToInstance(dtoClass, req.user);
    validate(dtoObject).then((errors) => {
      if (errors.length > 0) {
        return res.status(400).json({ message: 'validation failed', errors });
      }
      next();
    });
  };
};
