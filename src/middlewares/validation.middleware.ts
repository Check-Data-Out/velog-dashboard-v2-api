import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export const validateResponse = <T extends object>(dtoClass: new () => T) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoObject = plainToInstance(dtoClass, req.user);
      const errors = await validate(dtoObject);

      if (errors.length > 0) {
        return res.status(400).json({
          status: 400,
          message: '유효성 검사 실패',
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      req.user = dtoObject as T;
      next();
    } catch (error) {
      next(error);
    }
  };
};
