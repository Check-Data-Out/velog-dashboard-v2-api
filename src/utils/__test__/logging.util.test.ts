import { Request, Response } from 'express';
import { Socket } from 'net';
import { createLogContext, logError, logAccess, getClientIp, getLogLevel } from '@/utils/logging.util';
import { CustomError } from '@/exception';
import { User } from '@/types';
import logger from '@/configs/logger.config';

// logger 모킹
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('Logging Utilities', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      headers: { 'x-forwarded-for': '127.0.0.1' },
      method: 'GET',
      originalUrl: '/api/test',
      /* eslint-disable @typescript-eslint/consistent-type-assertions */
      user: { id: 123, velog_uuid: 'user123' } as User,
      requestId: 'test-request-id',
      startTime: Date.now() - 100,
    };

    mockResponse = {
      statusCode: 200,
      get: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientIp', () => {
    it('x-forwarded-for 헤더에서 IP를 추출해야 한다', () => {
      mockRequest.headers = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };
      expect(getClientIp(mockRequest as Request)).toBe('192.168.1.1');
    });

    it('x-real-ip 헤더에서 IP를 추출해야 한다', () => {
      mockRequest.headers = { 'x-real-ip': '203.0.113.1' };
      expect(getClientIp(mockRequest as Request)).toBe('203.0.113.1');
    });

    it('헤더가 없으면 unknown을 반환해야 한다', () => {
      mockRequest.headers = {};
      /* eslint-disable @typescript-eslint/consistent-type-assertions */
      mockRequest.socket = { remoteAddress: undefined } as Socket;
      expect(getClientIp(mockRequest as Request)).toBe('unknown');
    });
  });

  describe('getLogLevel', () => {
    it('200은 info 레벨을 반환해야 한다', () => {
      expect(getLogLevel(200)).toBe('info');
    });

    it('404는 warn 레벨을 반환해야 한다', () => {
      expect(getLogLevel(404)).toBe('warn');
    });

    it('500은 error 레벨을 반환해야 한다', () => {
      expect(getLogLevel(500)).toBe('error');
    });
  });

  describe('createLogContext', () => {
    it('요청에서 올바른 로그 컨텍스트를 생성해야 한다', () => {
      const context = createLogContext(mockRequest as Request);

      expect(context.requestId).toBe('test-request-id');
      expect(context.userId).toBe(123);
      expect(context.method).toBe('GET');
      expect(context.url).toBe('/api/test');
      expect(context.userAgent).toBeUndefined();
      expect(context.ip).toBe('127.0.0.1');
    });
  });

  describe('logError', () => {
    it('일반 에러를 올바르게 로깅해야 한다', () => {
      const error = new Error('Test error');
      mockResponse.statusCode = 500; // error 레벨을 위해 500으로 설정

      logError(mockRequest as Request, mockResponse as Response, error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            logger: 'error',
            message: 'Test error',
            statusCode: 500,
            requestId: 'test-request-id',
            userId: 123,
            method: 'GET',
            url: '/api/test',
            ip: '127.0.0.1',
          }),
        }),
      );
    });

    it('CustomError의 경우 에러 코드를 포함해야 한다', () => {
      const customError = new CustomError('Custom error', 'CUSTOM_ERROR', 400);
      mockResponse.statusCode = 400;

      logError(mockRequest as Request, mockResponse as Response, customError);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            errorCode: 'CUSTOM_ERROR',
          }),
        }),
      );
    });

    it('500이거나 예상하지 못한 에러는 스택 트레이스를 포함해야 한다', () => {
      const error = new Error('Test error');
      mockResponse.statusCode = 500;

      logError(mockRequest as Request, mockResponse as Response, error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            stack: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('logAccess', () => {
    it('액세스 로그를 올바르게 생성해야 한다', () => {
      (mockResponse.get as jest.Mock).mockReturnValue('1024');

      logAccess(mockRequest as Request, mockResponse as Response);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: 'access',
          statusCode: 200,
          responseTime: expect.any(Number),
          responseSize: 1024,
        }),
      );
    });
  });
});
