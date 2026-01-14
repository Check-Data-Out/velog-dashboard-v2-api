import { Request, Response } from 'express';
import { createErrorHandlingMiddleware } from '../errorHandling.middleware';
import { AuthRateLimitService } from '@/services/authRateLimit.service';
import { CustomError, InvalidTokenError } from '@/exception';
import * as Sentry from '@sentry/node';

jest.mock('@/configs/logger.config', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/utils/logging.util', () => ({
  logError: jest.fn(),
}));

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('ErrorHandlingMiddleware', () => {
  let mockService: jest.Mocked<AuthRateLimitService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockService = {
      trackAuthFailure: jest.fn(),
      isIpBlocked: jest.fn(),
      clearFailures: jest.fn(),
    } as unknown as jest.Mocked<AuthRateLimitService>;

    mockRequest = {
      ip: '192.168.1.1',
      method: 'POST',
      originalUrl: '/api/auth',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createErrorHandlingMiddleware', () => {
    it('AuthRateLimitService를 선택적 인자로 받아야 한다', () => {
      // AuthRateLimitService 없이 호출
      const middlewareWithoutService = createErrorHandlingMiddleware();
      expect(typeof middlewareWithoutService).toBe('function');

      // AuthRateLimitService와 함께 호출
      const middlewareWithService = createErrorHandlingMiddleware(mockService);
      expect(typeof middlewareWithService).toBe('function');
    });

    it('AuthRateLimitService 없이도 기존 동작이 유지되어야 한다', () => {
      const customError = new CustomError('테스트 에러', 'TEST_ERROR', 400);

      const middleware = createErrorHandlingMiddleware();
      middleware(customError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '테스트 에러',
        }),
      );
    });
  });

  describe('인증 실패 추적 연동', () => {
    it('InvalidTokenError 발생 시 authRateLimitService.trackAuthFailure를 호출해야 한다', async () => {
      const invalidTokenError = new InvalidTokenError('유효하지 않은 토큰입니다.');
      mockService.trackAuthFailure.mockResolvedValue(undefined);

      const middleware = createErrorHandlingMiddleware(mockService);
      await middleware(invalidTokenError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockService.trackAuthFailure).toHaveBeenCalledWith('192.168.1.1');
    });

    it('InvalidTokenError가 아닌 에러는 trackAuthFailure를 호출하지 않아야 한다', async () => {
      const customError = new CustomError('일반 에러', 'GENERAL_ERROR', 400);

      const middleware = createErrorHandlingMiddleware(mockService);
      await middleware(customError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockService.trackAuthFailure).not.toHaveBeenCalled();
    });

    it('authRateLimitService가 없으면 trackAuthFailure를 호출하지 않아야 한다', async () => {
      const invalidTokenError = new InvalidTokenError('유효하지 않은 토큰입니다.');

      const middleware = createErrorHandlingMiddleware(); // no service
      await middleware(invalidTokenError, mockRequest as Request, mockResponse as Response, nextFunction);

      // trackAuthFailure가 호출되지 않아야 함 (에러 없이 완료)
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Sentry 연동', () => {
    it('500 에러는 Sentry.captureException을 호출해야 한다', async () => {
      const generalError = new Error('Internal error');

      const middleware = createErrorHandlingMiddleware();
      await middleware(generalError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(Sentry.captureException).toHaveBeenCalledWith(generalError);
    });

    it('CustomError(400번대)는 Sentry.captureException을 호출하지 않아야 한다', async () => {
      const customError = new CustomError('클라이언트 에러', 'CLIENT_ERROR', 400);

      const middleware = createErrorHandlingMiddleware();
      await middleware(customError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('응답 형식', () => {
    it('CustomError는 적절한 상태 코드로 응답해야 한다', async () => {
      const customError = new CustomError('Not Found', 'NOT_FOUND', 404);

      const middleware = createErrorHandlingMiddleware();
      await middleware(customError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('일반 에러는 500 상태 코드로 응답해야 한다', async () => {
      const generalError = new Error('Something went wrong');

      const middleware = createErrorHandlingMiddleware();
      await middleware(generalError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('응답에 success, message, error 필드가 포함되어야 한다', async () => {
      const customError = new CustomError('Test Error', 'TEST', 400);

      const middleware = createErrorHandlingMiddleware();
      await middleware(customError, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Test Error',
          error: expect.any(Object),
        }),
      );
    });
  });
});
