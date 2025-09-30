import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import logger from '@/configs/logger.config';
import { LogContext, ErrorLogData, AccessLogData } from '@/types/logging';
import { CustomError } from '@/exception';

/**
 * 클라이언트 IP 주소 추출
 */
export const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * 요청에서 기본 로그 컨텍스트 생성
 */
export const createLogContext = (req: Request): LogContext => {
  return {
    requestId: req.requestId || randomUUID(),
    userId: req.user?.velog_uuid,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.headers['user-agent'],
    ip: getClientIp(req),
  };
};

/**
 * 로그 레벨과 로거 이름 결정
 */
export const getLogLevel = (statusCode: number): 'info' | 'warn' | 'error' => {
  if (statusCode < 400) return 'info';
  if (statusCode === 404) return 'warn';
  return 'error';
};

/**
 * 에러 로그 생성 및 출력
 *
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param error Error 객체
 * @param customMessage 커스텀 에러 메시지 (선택)
 * @param additionalData 추가 로그 데이터 (선택)
 */
export const logError = (
  req: Request,
  res: Response,
  error: Error,
  customMessage?: string,
  additionalData?: Record<string, unknown>,
): void => {
  const statusCode = res.statusCode || 500;
  const level = getLogLevel(statusCode);

  const context = createLogContext(req);
  const responseTime = req.startTime ? Date.now() - req.startTime : undefined;

  // 스택 트레이스 포함 여부 결정
  const includeStack = error instanceof CustomError && error.statusCode < 500 ? false : true;

  // 기본 에러 로그 데이터 생성 (winston 기본 필드 제외)
  const errorLogData: ErrorLogData = {
    logger: 'error',
    requestId: context.requestId,
    userId: context.userId,
    method: context.method,
    url: context.url,
    userAgent: context.userAgent,
    ip: context.ip,
    message: customMessage || error.message,
    statusCode,
    errorCode: error instanceof CustomError ? error.code : undefined,
    ...(includeStack && { stack: error.stack }),
    responseTime,
    ...additionalData,
  };

  logger[level]({ message: errorLogData });
};

/**
 * 액세스 로그 생성 및 출력
 *
 * @param req Express Request 객체
 * @param res Express Response 객체
 * @param additionalData 추가 로그 데이터 (선택)
 */
export const logAccess = (req: Request, res: Response, additionalData?: Record<string, unknown>): void => {
  const statusCode = res.statusCode;
  const level = getLogLevel(statusCode);

  const context = createLogContext(req);
  const responseTime = req.startTime ? Date.now() - req.startTime : 0;

  // 응답 크기 추정 (정확하지 않을 수 있음)
  const contentLength = res.get('content-length');
  const responseSize = contentLength ? parseInt(contentLength, 10) : undefined;

  const accessLogData: AccessLogData = {
    logger: 'access',
    requestId: context.requestId,
    userId: context.userId,
    method: context.method,
    url: context.url,
    userAgent: context.userAgent,
    ip: context.ip,
    statusCode,
    responseTime,
    responseSize,
    ...additionalData,
  };

  logger[level](accessLogData);
};

/**
 * 요청 시작 시점 기록을 위한 미들웨어 헬퍼
 */
export const recordRequestStart = (req: Request): void => {
  req.requestId = req.requestId || randomUUID();
  req.startTime = Date.now();
};
