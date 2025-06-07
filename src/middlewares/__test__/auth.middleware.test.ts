import { Request, Response } from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import pool from '@/configs/db.config';
import { mockUser } from '@/utils/fixtures';

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
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzc1MDcyNDAtMDkzYi0xMWVhLTlhYWUtYTU4YTg2YmIwNTIwIiwiaWF0IjoxNjAzOTM0NTI5LCJleHAiOjE2MDM5MzgxMjksImlzcyI6InZlbG9nLmlvIiwic3ViIjoiYWNjZXNzX3Rva2VuIn0.Q_I4PMBeeZSU-HbPZt7z9OW-tQjE0NI0I0DLF2qpZjY';

    it('유효한 토큰으로 사용자 정보를 Request에 추가해야 한다', async () => {
      // 유효한 토큰 준비
      mockRequest.cookies = {
        'access_token': validToken,
        'refresh_token': 'refresh-token'
      };

      // 사용자 정보 mock
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        velog_uuid: 'c7507240-093b-11ea-9aae-a58a86bb0520'
      };

      // DB 쿼리 결과 모킹
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser]
      });

      // 미들웨어 실행
      await authMiddleware.verify(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRequest.tokens).toEqual({
        accessToken: validToken,
        refreshToken: 'refresh-token'
      });
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM "users_user" WHERE velog_uuid = $1',
        ['c7507240-093b-11ea-9aae-a58a86bb0520']
      );
    });

    it('토큰이 없으면 InvalidTokenError를 전달해야 한다', async () => {
      // 토큰 없음
      mockRequest.cookies = {};

      // 미들웨어 실행
      await authMiddleware.verify(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'accessToken과 refreshToken의 입력이 올바르지 않습니다'
        })
      );
    });

    it('유효하지 않은 토큰으로 InvalidTokenError를 전달해야 한다', async () => {
      // 유효하지 않은 토큰 (JWT 형식은 맞지만 내용이 잘못됨)
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZhbGlkIjoidG9rZW4ifQ.invalidSignature';
      mockRequest.cookies = {
        'access_token': invalidToken,
        'refresh_token': 'refresh-token'
      };

      // 미들웨어 실행
      await authMiddleware.verify(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    });

    it('UUID가 없는 페이로드로 InvalidTokenError를 전달해야 한다', async () => {
      // UUID가 없는 토큰 (페이로드를 임의로 조작)
      const tokenWithoutUUID = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MDM5MzQ1MjksImV4cCI6MTYwMzkzODEyOSwiaXNzIjoidmVsb2cuaW8iLCJzdWIiOiJhY2Nlc3NfdG9rZW4ifQ.2fLHQ3yKs9UmBQUa2oat9UOLiXzXvrhv_XHU2qwLBs8';

      mockRequest.cookies = {
        'access_token': tokenWithoutUUID,
        'refresh_token': 'refresh-token'
      };

      // 미들웨어 실행
      await authMiddleware.verify(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: '유효하지 않은 토큰 페이로드 입니다.'
        })
      );
    });

    it('사용자를 찾을 수 없으면 DBError가 발생해야 한다', async () => {
      // 유효한 토큰 준비
      mockRequest.cookies = {
        'access_token': validToken,
        'refresh_token': 'refresh-token'
      };

      // 사용자가 없음 모킹
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      // 미들웨어 실행
      await authMiddleware.verify(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'DBError',
          message: '사용자를 찾을 수 없습니다.'
        })
      );
    });

    it('쿠키에 토큰이 없으면 헤더에서 토큰을 가져와야 한다', async () => {
      // 요청 본문에 토큰 설정
      mockRequest.body = {
        accessToken: validToken,
        refreshToken: 'refresh-token'
      };

      // DB 쿼리 결과 모킹
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUser]
      });

      // 미들웨어 실행
      await authMiddleware.verify(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // 검증
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockRequest.user).toEqual(mockUser);
    });
  });
});