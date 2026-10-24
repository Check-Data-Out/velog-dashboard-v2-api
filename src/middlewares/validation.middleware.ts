import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestError } from '@/exception';

type RequestKey = 'body' | 'user' | 'query';

export const validateRequestDto = <T extends object>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dtoClass: new (...args: any[]) => T,
  key: RequestKey,
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Express 5 는 JSON 이 아닌 요청의 req.body 를 undefined 로 두므로 빈 객체로 검증해 400 으로 보낸다
      const value = plainToInstance(dtoClass, req[key] ?? {});
      const errors = await validate(value);

      if (errors.length > 0) {
        throw new BadRequestError(`API 입력 검증 실패, errors: ${errors}`);
      }

      // Express 5 의 req.query 는 getter 전용이라 대입할 수 없어 검증된 query 는 res.locals.query 에 둔다
      if (key === 'query') {
        res.locals.query = value;
      } else {
        req[key] = value as T;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
