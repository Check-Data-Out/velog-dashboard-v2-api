import 'reflect-metadata'; // class-validator와 class-transformer 데코레이터, reflect-metadata 의존
import { Request, Response } from 'express';
import { UserController } from '@/controllers/user.controller';
import { UserService } from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { fetchVelogApi } from '@/modules/velog/velog.api';
import { BadRequestError, NotFoundError, QRTokenExpiredError, UnauthorizedError } from '@/exception';
import { signUnsubscribe } from '@/utils/unsubscribe.util';
import { mockUser, mockPool } from '@/utils/fixtures';
import logger from '@/configs/logger.config';
import { Pool } from 'pg';

// Mock dependencies
jest.mock('@/services/user.service');
jest.mock('@/modules/velog/velog.api');

// logger 모킹
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// 응답에 심거나 지운 쿠키 이름 목록
const namesOf = (mockFn: unknown): string[] => (mockFn as jest.Mock).mock.calls.map(([name]) => name);

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
      profile: { thumbnail: 'https://example.com/avatar.png' },
    };

    it('유효한 토큰으로 로그인에 성공해야 한다', async () => {
      mockRequest.body = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
      };

      (fetchVelogApi as jest.Mock).mockResolvedValue(mockVelogUser);
      mockUserService.handleUserTokensByVelogUUID.mockResolvedValue(mockUser);

      await userController.login(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(fetchVelogApi).toHaveBeenCalledWith('valid-access-token', 'valid-refresh-token');
      expect(mockUserService.handleUserTokensByVelogUUID).toHaveBeenCalledWith(
        mockVelogUser,
        'valid-access-token',
        'valid-refresh-token',
      );
      expect(namesOf(mockResponse.cookie)).toEqual(['vd_session']);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '로그인에 성공하였습니다.',
        data: {
          id: mockUser.id,
          username: mockUser.username,
          profile: { thumbnail: mockUser.thumbnail },
        },
        error: null,
      });
    });

    it('Velog API 호출 실패 시 에러를 전달해야 한다', async () => {
      mockRequest.body = {
        accessToken: 'invalid-access-token',
        refreshToken: 'invalid-refresh-token',
      };

      const apiError = new Error('Velog API 호출 실패');
      (fetchVelogApi as jest.Mock).mockRejectedValue(apiError);

      await userController.login(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(apiError);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('프로덕션 환경에서 세션 쿠키를 400일 httpOnly 로 심어야 한다', async () => {
      process.env.NODE_ENV = 'production';
      mockRequest.body = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
      };

      (fetchVelogApi as jest.Mock).mockResolvedValue(mockVelogUser);
      mockUserService.handleUserTokensByVelogUUID.mockResolvedValue(mockUser);

      await userController.login(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'vd_session',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          domain: 'velog-dashboard.kro.kr',
          maxAge: 400 * 24 * 60 * 60 * 1000,
        }),
      );
    });
  });

  describe('sampleLogin', () => {
    it('샘플 로그인에 성공해야 한다', async () => {
      mockUserService.findSampleUser.mockResolvedValue(mockUser);

      await userController.sampleLogin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.findSampleUser).toHaveBeenCalled();
      expect(namesOf(mockResponse.cookie)).toEqual(['vd_session']);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '로그인에 성공하였습니다.',
        data: {
          id: mockUser.id,
          username: '테스트 유저',
          profile: { thumbnail: 'https://velog.io/favicon.ico' },
        },
        error: null,
      });
    });

    it('샘플 사용자 찾기 실패 시 에러를 전달해야 한다', async () => {
      const error = new NotFoundError('샘플 사용자를 찾을 수 없습니다.');
      mockUserService.findSampleUser.mockRejectedValue(error);

      await userController.sampleLogin(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('로그아웃하면 사용자 세션을 끊고 세션·velog 토큰 쿠키를 모두 지워야 한다', async () => {
      await userController.logout(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.logout).toHaveBeenCalledWith(mockUser);
      expect(namesOf(mockResponse.clearCookie)).toEqual(['access_token', 'refresh_token', 'vd_session']);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '로그아웃에 성공하였습니다.',
        data: {},
        error: null,
      });
    });

    it('로그아웃 처리 중 DB 오류는 에러 핸들러로 넘겨야 한다', async () => {
      const error = new Error('DB 오류');
      mockUserService.logout.mockRejectedValueOnce(error);

      await userController.logout(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('fetchCurrentUser', () => {
    it('현재 사용자 정보를 반환해야 한다', async () => {
      await userController.fetchCurrentUser(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '유저 정보 조회에 성공하였습니다.',
        data: {
          id: mockUser.id,
          username: mockUser.username || '',
          profile: { thumbnail: mockUser.thumbnail || '' },
        },
        error: null,
      });
    });

    it('username과 thumbnail이 null인 경우 빈 문자열로 처리해야 한다', async () => {
      const userWithNulls = { ...mockUser, username: null, thumbnail: null };
      mockRequest.user = userWithNulls;

      await userController.fetchCurrentUser(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: '유저 정보 조회에 성공하였습니다.',
        data: {
          id: userWithNulls.id,
          username: '',
          profile: { thumbnail: '' },
        },
        error: null,
      });
    });
  });

  describe('createToken', () => {
    it('QR 토큰 생성에 성공해야 한다', async () => {
      const mockToken = 'ABCD123456';
      mockRequest.headers = {
        'x-forwarded-for': '192.168.1.1, 127.0.0.1',
        'user-agent': 'Mozilla/5.0 (Test Browser)',
      };
      mockUserService.createUserQRToken.mockResolvedValue(mockToken);

      await userController.createToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.createUserQRToken).toHaveBeenCalledWith(
        mockUser.id,
        '192.168.1.1',
        'Mozilla/5.0 (Test Browser)',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'QR 토큰 생성 완료',
        data: { token: mockToken },
        error: null,
      });
    });

    it('IP 주소가 없는 경우 빈 문자열을 사용해야 한다', async () => {
      const mockToken = 'ABCD123456';
      const mockRequestWithoutIp = {
        ...mockRequest,
        headers: { 'user-agent': 'Test Browser' },
        ip: undefined,
      };
      mockUserService.createUserQRToken.mockResolvedValue(mockToken);

      await userController.createToken(mockRequestWithoutIp as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.createUserQRToken).toHaveBeenCalledWith(mockUser.id, '', 'Test Browser');
    });

    it('User-Agent 가 255자를 넘으면 255자로 잘라 넘겨야 한다', async () => {
      mockRequest.headers = { 'user-agent': 'a'.repeat(300) };
      mockUserService.createUserQRToken.mockResolvedValue('ABC123EFGH');

      await userController.createToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.createUserQRToken).toHaveBeenCalledWith(mockUser.id, '127.0.0.1', 'a'.repeat(255));
    });

    it('QR 토큰 생성 실패 시 에러를 전달해야 한다', async () => {
      const error = new Error('토큰 생성 실패');
      mockUserService.createUserQRToken.mockRejectedValue(error);

      await userController.createToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    it('토큰을 소비하지 않고 FE 확인 화면으로 리다이렉트해야 한다', async () => {
      mockRequest.query = { token: 'ABC+12/3&=' };

      await userController.getToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.useToken).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(`/qr-login?token=${encodeURIComponent('ABC+12/3&=')}`);
    });

    it('토큰이 없거나 문자열이 아니면 토큰 없이 FE 확인 화면으로 리다이렉트해야 한다', async () => {
      mockRequest.query = { token: ['a', 'b'] };

      await userController.getToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.useToken).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith('/qr-login');
    });
  });

  describe('confirmToken', () => {
    beforeEach(() => {
      mockRequest.headers = { 'user-agent': 'phone-agent' };
    });

    it('유효한 토큰을 확인하면 세션 쿠키를 심고 200 을 응답해야 한다', async () => {
      mockRequest.body = { token: 'ABC123EFGH' };
      mockUserService.useToken.mockResolvedValue(mockUser);

      await userController.confirmToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.useToken).toHaveBeenCalledWith('ABC123EFGH', '127.0.0.1', 'phone-agent');
      expect(namesOf(mockResponse.cookie)).toEqual(['vd_session']);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('x-forwarded-for 첫 값이 IP 컬럼 길이(45)를 넘으면 잘라서 넘겨야 한다', async () => {
      mockRequest.body = { token: 'ABC123EFGH' };
      mockRequest.headers = { 'user-agent': 'phone-agent', 'x-forwarded-for': `${'1'.repeat(60)}, 192.168.0.1` };
      mockUserService.useToken.mockResolvedValue(mockUser);

      await userController.confirmToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.useToken).toHaveBeenCalledWith('ABC123EFGH', '1'.repeat(45), 'phone-agent');
    });

    it('만료되었거나 이미 사용된 토큰이면 QRTokenExpiredError 를 넘겨야 한다', async () => {
      mockRequest.body = { token: 'ABC123EFGH' };
      mockUserService.useToken.mockResolvedValue(null);

      await userController.confirmToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(QRTokenExpiredError));
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('비활성 사용자면 서비스의 UnauthorizedError 를 넘겨야 한다', async () => {
      mockRequest.body = { token: 'ABC123EFGH' };
      const error = new UnauthorizedError('로그인할 수 없는 사용자입니다.');
      mockUserService.useToken.mockRejectedValue(error);

      await userController.confirmToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('토큰 사용 중 에러 발생 시 에러를 전달해야 한다', async () => {
      mockRequest.body = { token: 'ABC123EFGH' };
      const error = new Error('토큰 사용 실패');
      mockUserService.useToken.mockRejectedValue(error);

      await userController.confirmToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getTokenStatus', () => {
    it('본인 토큰의 상태를 서비스 결과 그대로 응답해야 한다', async () => {
      mockResponse.locals = { query: { token: 'ABC123EFGH' } };
      const status = {
        status: 'used' as const,
        usedAt: '2026-10-22T00:00:00.000Z',
        userAgent: 'phone-agent',
        ip: '10.0.0.1',
      };
      mockUserService.getQRLoginTokenStatus.mockResolvedValue(status);

      await userController.getTokenStatus(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.getQRLoginTokenStatus).toHaveBeenCalledWith('ABC123EFGH', mockUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: status }));
    });
  });

  describe('unsubscribeNewsletter', () => {
    beforeEach(() => {
      mockRequest.query = {};
      mockResponse.redirect = jest.fn().mockReturnThis();
    });

    it('이메일이 없으면 메인 페이지로 리다이렉트해야 한다', async () => {
      mockRequest.query = {};

      await userController.unsubscribeNewsletter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.unsubscribeNewsletter).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith('/main');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('잘못된 이메일 형식이면 메인 페이지로 리다이렉트해야 한다', async () => {
      mockRequest.query = { email: 'invalid-email' };

      await userController.unsubscribeNewsletter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.unsubscribeNewsletter).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith('/main');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('구독 해제 완료시 메인 페이지로 리다이렉트해야 한다', async () => {
      const email = 'test@example.com';
      mockRequest.query = { email };
      mockUserService.unsubscribeNewsletter.mockResolvedValue(undefined);

      await userController.unsubscribeNewsletter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.unsubscribeNewsletter).toHaveBeenCalledWith(email, {
        source: '기존 email 링크',
        ip: '127.0.0.1',
        userAgent: '',
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith('/main');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('서명 링크(uid·sig)로 들어오면 상태를 바꾸지 않고 서명을 fragment 에 담아 FE 확인 페이지로 리다이렉트해야 한다', async () => {
      mockRequest.query = { uid: '42', sig: 'a+b/c=' };

      await userController.unsubscribeNewsletter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.unsubscribeNewsletter).not.toHaveBeenCalled();
      expect(mockUserService.unsubscribeNewsletterById).not.toHaveBeenCalled();
      // 분석 도구가 수집하는 query 대신 fragment 에 담아 서명이 새지 않게 한다
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `/newsletter/unsubscribe#uid=42&sig=${encodeURIComponent('a+b/c=')}`,
      );
    });
  });

  describe('confirmUnsubscribeNewsletter', () => {
    const sig = signUnsubscribe(process.env.NEWSLETTER_UNSUBSCRIBE_SECRET as string, 42);

    beforeEach(() => {
      mockRequest.headers = { 'user-agent': 'mail-provider' };
      mockRequest.body = { 'List-Unsubscribe': 'One-Click' };
    });

    it('메일 사업자의 원클릭 POST(Origin 없음)는 수신거부하고 리다이렉트 없이 200 을 응답해야 한다', async () => {
      mockResponse.locals = { query: { uid: '42', sig } };

      await userController.confirmUnsubscribeNewsletter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.unsubscribeNewsletterById).toHaveBeenCalledWith(42, {
        source: '원클릭(메일 사업자)',
        ip: '127.0.0.1',
        userAgent: 'mail-provider',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('확인 페이지 POST(Origin 있음)는 경로를 확인 페이지로 구분해야 한다', async () => {
      mockResponse.locals = { query: { uid: '42', sig } };
      mockRequest.headers = { origin: 'https://velog-dashboard.kro.kr', 'user-agent': 'browser' };

      await userController.confirmUnsubscribeNewsletter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockUserService.unsubscribeNewsletterById).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ source: '확인 페이지' }),
      );
    });

    it('서명이 맞지 않으면 BadRequestError 를 넘기고 수신거부하지 않으며, 스캐너·변조 링크라 warn 으로만 남겨야 한다', async () => {
      mockResponse.locals = { query: { uid: '43', sig } };

      await userController.confirmUnsubscribeNewsletter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(mockUserService.unsubscribeNewsletterById).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('서명 키가 설정되지 않았으면 503 을 넘기고 수신거부하지 않아야 한다', async () => {
      mockResponse.locals = { query: { uid: '42', sig } };
      const secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
      delete process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;

      try {
        await userController.confirmUnsubscribeNewsletter(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );
      } finally {
        process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = secret;
      }

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
      expect(mockUserService.unsubscribeNewsletterById).not.toHaveBeenCalled();
    });
  });
});
