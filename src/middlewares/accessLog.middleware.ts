import { Request, Response, NextFunction } from 'express';
import { recordRequestStart, logAccess } from '@/utils/logging.util';

/**
 * 액세스 로그 미들웨어
 * 모든 요청의 시작과 끝을 기록합니다.
 */
export const accessLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 요청 시작 시점 기록
  recordRequestStart(req);

  // 응답 완료 시 액세스 로그 기록
  res.on('finish', () => {
    if (res.statusCode < 400) {
      // 400 미만만 액세스 로그, 그 외 에러 로깅
      logAccess(req, res);
    }
  });

  next();
};
