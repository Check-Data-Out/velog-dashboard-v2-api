import 'reflect-metadata'; // class-validator와 class-transformer 데코레이터, reflect-metadata 의존
import { Request, Response } from 'express';
import { UserController } from '@/controllers/user.controller';
import { UserService } from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { fetchVelogApi } from '@/modules/velog/velog.api';
import { NotFoundError } from '@/exception';
import { mockUser, mockPool } from '@/utils/fixtures';
import { Pool } from 'pg';

// Mock dependencies
jest.mock('@/services/user.service');
jest.mock('@/modules/velog/velog.api');

// logger 모킹
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

// 환경변수 모킹 (AES 키 설정, 첫 메모리 로드될때 util 함수쪽 key 세팅 이슈 방지)
process.env.AES_KEY_0 = 'a'.repeat(32);
process.env.AES_KEY_1 = 'b'.repeat(32);
process.env.AES_KEY_2 = 'c'.repeat(32);
process.env.AES_KEY_3 = 'd'.repeat(32);
process.env.AES_KEY_4 = 'e'.repeat(32);
process.env.AES_KEY_5 = 'f'.repeat(32);
process.env.AES_KEY_6 = 'g'.repeat(32);
process.env.AES_KEY_7 = 'h'.repeat(32);
process.env.AES_KEY_8 = 'i'.repeat(32);
process.env.AES_KEY_9 = 'j'.repeat(32);
process.env.NODE_ENV = 'test';


describe('UserController', () => {
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';

    // UserService 모킹
    const userRepo = new UserRepository(mockPool as unknown as Pool);
    const serviceInstance = new UserService(userRepo);
    mockUserService = serviceInstance as jest.Mocked<UserService>;

    // UserController 인스턴스 생성
    userController = new UserController(mockUserService);

    // Request, Response, NextFunction 모킹
    mockRequest = {
      body: {},
      headers: {},
      user: mockUser,
      ip: '127.0.0.1',
      query: {},
    };

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockVelogUser = {
      id: 'velog-uuid-123',
      username: 'testuser',
      email: 'test@example.com',
      profile: { thumbnail: 'https://example.com/avatar.png' }
    };

    it('유효한 토큰으로 로그인에 성공해야 한다', async () => {
      mockRequest.body = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token'
      };

      (fetchVelogApi as jest.Mock).mockResolvedValue(mockVelogUser);
      mockUserService.handleUserTokensByVelogUUID.mockResolvedValue(mockUser);

      await userController.login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(fetchVelogApi).toHaveBeenCalledWith('valid-access-token', 'valid-refresh-token');
      expect(mockUserService.handleUserTokensByVelogUUID).toHaveBeenCalledWith(
        mockVelogUser,
        'valid-access-token',
        'valid-refresh-token'
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '로그인에 성공하였습니다.',
        data: {
          id: mockUser.id,
          username: mockUser.username,
          profile: { thumbnail: mockUser.thumbnail }
        },
        error: null
      });
    });

    it('Velog API 호출 실패 시 에러를 전달해야 한다', async () => {
      mockRequest.body = {
        accessToken: 'invalid-access-token',
        refreshToken: 'invalid-refresh-token'
      };

      const apiError = new Error('Velog API 호출 실패');
      (fetchVelogApi as jest.Mock).mockRejectedValue(apiError);

      await userController.login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(apiError);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('프로덕션 환경에서 올바른 쿠키 옵션을 설정해야 한다', async () => {
      process.env.NODE_ENV = 'production';
      mockRequest.body = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token'
      };

      (fetchVelogApi as jest.Mock).mockResolvedValue(mockVelogUser);
      mockUserService.handleUserTokensByVelogUUID.mockResolvedValue(mockUser);

      await userController.login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'valid-access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          domain: 'velog-dashboard.kro.kr'
        })
      );
    });
  });

  describe('sampleLogin', () => {
    const mockSampleUser = {
      user: mockUser,
      decryptedAccessToken: 'decrypted-access-token',
      decryptedRefreshToken: 'decrypted-refresh-token'
    };

    it('샘플 로그인에 성공해야 한다', async () => {
      mockUserService.findSampleUser.mockResolvedValue(mockSampleUser);

      await userController.sampleLogin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockUserService.findSampleUser).toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '로그인에 성공하였습니다.',
        data: {
          id: mockUser.id,
          username: '테스트 유저',
          profile: { thumbnail: 'https://velog.io/favicon.ico' }
        },
        error: null
      });
    });

    it('샘플 사용자 찾기 실패 시 에러를 전달해야 한다', async () => {
      const error = new NotFoundError('샘플 사용자를 찾을 수 없습니다.');
      mockUserService.findSampleUser.mockRejectedValue(error);

      await userController.sampleLogin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('로그아웃에 성공해야 한다', async () => {
      await userController.logout(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ domain: 'localhost' })
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ domain: 'localhost' })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '로그아웃에 성공하였습니다.',
        data: {},
        error: null
      });
    });
  });

  describe('fetchCurrentUser', () => {
    it('현재 사용자 정보를 반환해야 한다', async () => {
      await userController.fetchCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '유저 정보 조회에 성공하였습니다.',
        data: {
          id: mockUser.id,
          username: mockUser.username || '',
          profile: { thumbnail: mockUser.thumbnail || '' }
        },
        error: null
      });
    });

    it('username과 thumbnail이 null인 경우 빈 문자열로 처리해야 한다', async () => {
      const userWithNulls = { ...mockUser, username: null, thumbnail: null };
      mockRequest.user = userWithNulls;

      await userController.fetchCurrentUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '유저 정보 조회에 성공하였습니다.',
        data: {
          id: userWithNulls.id,
          username: '',
          profile: { thumbnail: '' }
        },
        error: null
      });
    });
  });

  describe('createToken', () => {
    it('QR 토큰 생성에 성공해야 한다', async () => {
      const mockToken = 'ABCD123456';
      mockRequest.headers = {
        'x-forwarded-for': '192.168.1.1, 127.0.0.1',
        'user-agent': 'Mozilla/5.0 (Test Browser)'
      };
      mockUserService.createUserQRToken.mockResolvedValue(mockToken);

      await userController.createToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockUserService.createUserQRToken).toHaveBeenCalledWith(
        mockUser.id,
        '192.168.1.1',
        'Mozilla/5.0 (Test Browser)'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'QR 토큰 생성 완료',
        data: { token: mockToken },
        error: null
      });
    });

    it('IP 주소가 없는 경우 빈 문자열을 사용해야 한다', async () => {
      const mockToken = 'ABCD123456';
      const mockRequestWithoutIp = {
        ...mockRequest,
        headers: { 'user-agent': 'Test Browser' },
        ip: undefined
      };
      mockUserService.createUserQRToken.mockResolvedValue(mockToken);

      await userController.createToken(
        mockRequestWithoutIp as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockUserService.createUserQRToken).toHaveBeenCalledWith(
        mockUser.id,
        '',
        'Test Browser'
      );
    });

    it('QR 토큰 생성 실패 시 에러를 전달해야 한다', async () => {
      const error = new Error('토큰 생성 실패');
      mockUserService.createUserQRToken.mockRejectedValue(error);

      await userController.createToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    const mockUserLoginToken = {
      decryptedAccessToken: 'decrypted-access-token',
      decryptedRefreshToken: 'decrypted-refresh-token'
    };

    it('유효한 토큰으로 QR 로그인에 성공해야 한다', async () => {
      mockRequest.query = { token: 'valid-token' };
      mockUserService.useToken.mockResolvedValue(mockUserLoginToken);

      await userController.getToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockUserService.useToken).toHaveBeenCalledWith('valid-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.redirect).toHaveBeenCalledWith('/main');
    });

    it('토큰이 없는 경우 에러를 전달해야 한다', async () => {
      mockRequest.query = {};

      await userController.getToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '토큰이 필요합니다.'
        })
      );
    });

    it('만료된 토큰인 경우 에러를 전달해야 한다', async () => {
      mockRequest.query = { token: 'expired-token' };
      mockUserService.useToken.mockResolvedValue(null);

      await userController.getToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    it('토큰 사용 중 에러 발생 시 에러를 전달해야 한다', async () => {
      mockRequest.query = { token: 'valid-token' };
      const error = new Error('토큰 사용 실패');
      mockUserService.useToken.mockRejectedValue(error);

      await userController.getToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });
  });
});