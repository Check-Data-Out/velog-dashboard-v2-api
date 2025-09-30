/**
 * 기본 로그 컨텍스트 정보
 */
export interface LogContext {
  requestId: string;
  userId?: number;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

/**
 * 에러 로그 데이터
 */
export interface ErrorLogData extends LogContext {
  logger: string;
  message: string;
  statusCode: number;
  errorCode?: string;
  stack?: string;
  responseTime?: number;
}

/**
 * 액세스 로그 데이터
 */
export interface AccessLogData extends LogContext {
  logger: string;
  statusCode: number;
  responseTime: number;
  responseSize?: number;
}
