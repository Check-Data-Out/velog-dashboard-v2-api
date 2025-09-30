import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import logger from '@/configs/logger.config';
import { BadRequestError } from '@/exception';

type RequestKey = 'body' | 'user' | 'query';

export const validateRequestDto = <T extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dtoClass: new (...args: any[]) => T,
  key: RequestKey,
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const value = plainToInstance(dtoClass, req[key]);
      const errors = await validate(value);

      if (errors.length > 0) {
        throw new BadRequestError(`API 입력 검증 실패, errors: ${errors}`);
      }

      req[key] = value as T;
      next();
    } catch (error) {
      logger.error(`${key} Dto 검증 중 오류 발생 : `, error);
      next(error);
    }
  };
};
