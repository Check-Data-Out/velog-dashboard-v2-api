import { NextFunction, Request, Response, RequestHandler } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import logger from '../configs/logger.config';

type RequestKey = 'body' | 'user';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateDto = <T extends object>(dtoClass: new (...args: any) => T, key: RequestKey) => {
  return (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const value = plainToInstance(dtoClass, req[key]);
      const errors = await validate(value);

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

      req[key] = value as T;
      next();
    } catch (error) {
      logger.error(`${key} Dto 검증 중 오류 발생 : `, error);
      next(error);
    }
  }) as RequestHandler;
};
