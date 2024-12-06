import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export const validateResponse = <T extends object>(dtoClass: new () => T) => {
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
