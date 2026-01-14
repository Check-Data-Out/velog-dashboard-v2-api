import { Request, Response } from 'express';
import { authMiddleware, verifyBearerTokens } from '@/middlewares/auth.middleware';
import pool from '@/configs/db.config';
import { mockUser } from '@/utils/fixtures';
import { AuthRateLimitService } from '@/services/authRateLimit.service';

// pool.query 모킹
jest.mock('@/configs/db.config', () => ({
  query: jest.fn(),
}));

// logger 모킹
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('인증 미들웨어', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    // 테스트마다 request, response, next 함수 초기화
    mockRequest = {
      body: {},
      headers: {},
      cookies: {},
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verify', () => {
    const validToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzc1MDcyNDAtMDkzYi0xMWVhLTlhYWUtYTU4YTg2YmIwNTIwIiwiaWF0IjoxNjAzOTM0NTI5LCJleHAiOjE2MDM5MzgxMjksImlzcyI6InZlbG9nLmlvIiwic3ViIjoiYWNjZXNzX3Rva2VuIn0.Q_I4PMBeeZSU-HbPZt7z9OW-tQjE0NI0I0DLF2qpZjY';

    it('유효한 토큰으로 사용자 정보를 Request에 추가해야 한다', async () => {
      // 유효한 토큰 준비
      mockRequest.cookies = {
        access_token: validToken,
        refresh_token: 'refresh-token',
      };

      // 사용자 정보 mock
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        velog_uuid: 'c7507240-093b-11ea-9aae-a58a86bb0520',
      };

      // DB 쿼리 결과 모킹
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser],
      });

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRequest.tokens).toEqual({
        accessToken: validToken,
        refreshToken: 'refresh-token',
      });
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM "users_user" WHERE velog_uuid = $1', [
        'c7507240-093b-11ea-9aae-a58a86bb0520',
      ]);
    });

    it('토큰이 없으면 InvalidTokenError를 전달해야 한다', async () => {
      // 토큰 없음
      mockRequest.cookies = {};

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'accessToken과 refreshToken의 입력이 올바르지 않습니다',
        }),
      );
    });

    it('유효하지 않은 토큰으로 InvalidTokenError를 전달해야 한다', async () => {
      // 유효하지 않은 토큰 (JWT 형식은 맞지만 내용이 잘못됨)
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZhbGlkIjoidG9rZW4ifQ.invalidSignature';
      mockRequest.cookies = {
        access_token: invalidToken,
        refresh_token: 'refresh-token',
      };

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    });

    it('UUID가 없는 페이로드로 InvalidTokenError를 전달해야 한다', async () => {
      // UUID가 없는 토큰 (페이로드를 임의로 조작)
      const tokenWithoutUUID =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MDM5MzQ1MjksImV4cCI6MTYwMzkzODEyOSwiaXNzIjoidmVsb2cuaW8iLCJzdWIiOiJhY2Nlc3NfdG9rZW4ifQ.2fLHQ3yKs9UmBQUa2oat9UOLiXzXvrhv_XHU2qwLBs8';

      mockRequest.cookies = {
        access_token: tokenWithoutUUID,
        refresh_token: 'refresh-token',
      };

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: '유효하지 않은 토큰 페이로드 입니다.',
        }),
      );
    });

    it('사용자를 찾을 수 없으면 DBError가 발생해야 한다', async () => {
      // 유효한 토큰 준비
      mockRequest.cookies = {
        access_token: validToken,
        refresh_token: 'refresh-token',
      };

      // 사용자가 없음 모킹
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'DBError',
          message: '사용자를 찾을 수 없습니다.',
        }),
      );
    });

    it('쿠키에 토큰이 없으면 헤더에서 토큰을 가져와야 한다', async () => {
      // 요청 본문에 토큰 설정
      mockRequest.body = {
        accessToken: validToken,
        refreshToken: 'refresh-token',
      };

      // DB 쿼리 결과 모킹
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser],
      });

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('JWT 형식이 아닌 토큰은 DB 쿼리 없이 InvalidTokenError를 발생시켜야 한다', async () => {
      // JWT 형식이 아닌 쓰레기 토큰
      mockRequest.cookies = {
        access_token: 'garbage-token-without-dots',
        refresh_token: 'refresh-token',
      };

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증: InvalidTokenError 발생, DB 쿼리 호출 안됨
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
        }),
      );
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('깨진 Base64 페이로드를 가진 토큰은 InvalidTokenError를 발생시켜야 한다', async () => {
      // JWT 형식은 맞지만 페이로드가 유효하지 않은 JSON인 토큰
      // 'not-valid-json'을 base64url 인코딩
      const corruptedPayload = Buffer.from('not-valid-json').toString('base64url');
      const corruptedToken = `eyJhbGciOiJIUzI1NiJ9.${corruptedPayload}.signature`;

      mockRequest.cookies = {
        access_token: corruptedToken,
        refresh_token: 'refresh-token',
      };

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증: InvalidTokenError 발생, DB 쿼리 호출 안됨
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
        }),
      );
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('Base64URL이 아닌 문자가 포함된 토큰은 InvalidTokenError를 발생시켜야 한다', async () => {
      // Base64URL에 허용되지 않는 문자(+, /, =, 한글 등) 포함
      mockRequest.cookies = {
        access_token: 'invalid+token/with=special.chars!@#.signature',
        refresh_token: 'refresh-token',
      };

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증: InvalidTokenError 발생, DB 쿼리 호출 안됨
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
        }),
      );
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('user_id가 UUID 형식이 아니면 InvalidTokenError를 발생시켜야 한다', async () => {
      // user_id가 있지만 UUID 형식이 아닌 토큰
      // payload: {"user_id":"not-a-uuid"}
      const invalidPayload = Buffer.from(JSON.stringify({ user_id: 'not-a-uuid' })).toString('base64url');
      const tokenWithInvalidUUID = `eyJhbGciOiJIUzI1NiJ9.${invalidPayload}.signature`;

      mockRequest.cookies = {
        access_token: tokenWithInvalidUUID,
        refresh_token: 'refresh-token',
      };

      // 미들웨어 실행
      await authMiddleware.verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // 검증: InvalidTokenError 발생, DB 쿼리 호출 안됨
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: '유효하지 않은 토큰 페이로드 입니다.',
        }),
      );
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});

describe('verifyBearerTokens', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockRateLimitService: jest.Mocked<AuthRateLimitService>;

  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzc1MDcyNDAtMDkzYi0xMWVhLTlhYWUtYTU4YTg2YmIwNTIwIiwiaWF0IjoxNjAzOTM0NTI5LCJleHAiOjE2MDM5MzgxMjksImlzcyI6InZlbG9nLmlvIiwic3ViIjoiYWNjZXNzX3Rva2VuIn0.Q_I4PMBeeZSU-HbPZt7z9OW-tQjE0NI0I0DLF2qpZjY';

  beforeEach(() => {
    mockRequest = {
      body: {},
      headers: {},
      cookies: {},
      ip: '192.168.1.1',
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();

    mockRateLimitService = {
      trackAuthFailure: jest.fn(),
      isIpBlocked: jest.fn(),
      clearFailures: jest.fn(),
    } as unknown as jest.Mocked<AuthRateLimitService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('함수 시그니처', () => {
    it('AuthRateLimitService를 인자로 받아 미들웨어 함수를 반환해야 한다', () => {
      const middleware = verifyBearerTokens(mockRateLimitService);
      expect(typeof middleware).toBe('function');
    });

    it('AuthRateLimitService 없이도 동작해야 한다', () => {
      const middleware = verifyBearerTokens();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Rate Limit 통합', () => {
    it('rate limit 서비스가 주입되면 isIpBlocked를 먼저 호출해야 한다', async () => {
      mockRateLimitService.isIpBlocked.mockResolvedValue(false);
      mockRequest.cookies = {
        access_token: validToken,
        refresh_token: 'refresh-token',
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser],
      });

      const verify = verifyBearerTokens(mockRateLimitService);
      await verify(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRateLimitService.isIpBlocked).toHaveBeenCalledWith('192.168.1.1');
    });

    it('IP가 차단되면 429 응답을 반환해야 한다', async () => {
      mockRateLimitService.isIpBlocked.mockResolvedValue(true);

      const verify = verifyBearerTokens(mockRateLimitService);
      await verify(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          retryAfter: expect.any(Number),
        }),
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('IP가 차단되지 않으면 기존 토큰 검증 로직을 실행해야 한다', async () => {
      mockRateLimitService.isIpBlocked.mockResolvedValue(false);
      mockRequest.cookies = {
        access_token: validToken,
        refresh_token: 'refresh-token',
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser],
      });

      const verify = verifyBearerTokens(mockRateLimitService);
      await verify(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('rate limit 서비스 에러 발생 시 fail-open으로 토큰 검증을 계속해야 한다', async () => {
      mockRateLimitService.isIpBlocked.mockRejectedValue(new Error('Redis error'));
      mockRequest.cookies = {
        access_token: validToken,
        refresh_token: 'refresh-token',
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser],
      });

      const verify = verifyBearerTokens(mockRateLimitService);
      await verify(mockRequest as Request, mockResponse as Response, nextFunction);

      // fail-open: 에러가 나도 토큰 검증 계속 진행
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toEqual(mockUser);
    });

    it('rate limit 서비스가 없으면 rate limit 체크 없이 토큰 검증만 해야 한다', async () => {
      mockRequest.cookies = {
        access_token: validToken,
        refresh_token: 'refresh-token',
      };
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser],
      });

      const verify = verifyBearerTokens(); // no service
      await verify(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toEqual(mockUser);
    });
  });
});
