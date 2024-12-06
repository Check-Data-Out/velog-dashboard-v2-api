import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import logger from 'src/configs/logger.config';

export const validateResponse = <T extends object>(dtoClass: new () => T) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoObject = plainToInstance(dtoClass, req.user);

      const errors = await validate(dtoObject);
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: '검증에 실패하였습니다. 입력값을 다시 확인해주세요.',
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      req.user = dtoObject;
      next();
    } catch (error) {
      logger.error('Dto 검증 중 오류 발생', error);
      next(error);
    }
  };
};
