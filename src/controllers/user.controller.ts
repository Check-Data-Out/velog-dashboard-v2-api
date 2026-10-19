import { NextFunction, Request, Response, RequestHandler } from 'express';
import logger from '@/configs/logger.config';
import { EmptyResponseDto, LoginResponseDto } from '@/types';
import { QRLoginTokenResponseDto } from '@/types/dto/responses/qrResponse.type';
import { UserService } from '@/services/user.service';
import { fetchVelogApi } from '@/modules/velog/velog.api';
import { QRTokenExpiredError, QRTokenInvalidError } from '@/exception';
import { cookieOption, setSessionCookie } from '@/utils/cookie.util';

type Token10 = string & { __lengthBrand: 10 };

export class UserController {
  constructor(private userService: UserService) {}

  login: RequestHandler = async (req: Request, res: Response<LoginResponseDto>, next: NextFunction): Promise<void> => {
    try {
      // 1. 외부 API (velog) 호출로 실존 하는 토큰 & 사용자 인지 검증
      const { accessToken, refreshToken } = req.body;
      const velogUser = await fetchVelogApi(accessToken, refreshToken);

      // 2. 우리쪽 DB에 사용자 존재 여부 체크 후 로그인 바로 진행 또는 사용자 생성 후 로그인 진행
      const user = await this.userService.handleUserTokensByVelogUUID(velogUser, accessToken, refreshToken);

      // 3. 로그인 완료 후 세션 쿠키 세팅 (velog 토큰은 브라우저로 보내지 않는다)
      setSessionCookie(res, user);

      const response = new LoginResponseDto(
        true,
        '로그인에 성공하였습니다.',
        { id: user.id, username: user.username || '', profile: { thumbnail: user.thumbnail || '' } },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  };

  sampleLogin: RequestHandler = async (
    req: Request,
    res: Response<LoginResponseDto>,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sampleUser = await this.userService.findSampleUser();

      setSessionCookie(res, sampleUser.user);

      req.user = sampleUser.user;

      const response = new LoginResponseDto(
        true,
        '로그인에 성공하였습니다.',
        {
          id: sampleUser.user.id,
          username: '테스트 유저',
          profile: { thumbnail: 'https://velog.io/favicon.ico' },
        },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  };

  logout: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>) => {
    res.clearCookie('access_token', cookieOption(true));
    res.clearCookie('refresh_token', cookieOption(true));

    const response = new EmptyResponseDto(true, '로그아웃에 성공하였습니다.', {}, null);

    res.status(200).json(response);
  };

  fetchCurrentUser: RequestHandler = async (req: Request, res: Response<LoginResponseDto>) => {
    const currentUser = req.user;

    // 인가 middle 에서 만든 객체 그대로 재활용
    const username = currentUser.username || '';
    const profile = { thumbnail: currentUser.thumbnail || '' };

    const response = new LoginResponseDto(
      true,
      '유저 정보 조회에 성공하였습니다.',
      { id: currentUser.id, username: username, profile: profile },
      null,
    );

    res.status(200).json(response);
  };

  createToken: RequestHandler = async (req: Request, res: Response<QRLoginTokenResponseDto>, next: NextFunction) => {
    try {
      const user = req.user;
      const ip =
        typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0].trim()
          : (req.ip ?? '');
      const userAgent = req.headers['user-agent'] || '';

      const token = await this.userService.createUserQRToken(user.id, ip, userAgent);
      const typedToken = token as Token10;

      const response = new QRLoginTokenResponseDto(true, 'QR 토큰 생성 완료', { token: typedToken }, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error(`QR 토큰 생성 실패: [userId: ${req.user?.id || 'anonymous'}]`, error);
      next(error);
    }
  };

  getToken: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        throw new QRTokenInvalidError('토큰이 필요합니다.');
      }

      const userLoginToken = await this.userService.useToken(token);
      if (!userLoginToken) {
        throw new QRTokenExpiredError();
      }

      setSessionCookie(res, userLoginToken.user);

      res.redirect('/main');
    } catch (error) {
      logger.error(`QR 토큰 로그인 처리 실패: [userId: ${req.user?.id || 'anonymous'}]`, error);
      next(error);
    }
  };

  unsubscribeNewsletter: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>, next: NextFunction) => {
    try {
      const email = req.query.email as string;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        logger.error(`올바르지 않은 이메일: [email: ${req.query.email}]`);
      } else {
        await this.userService.unsubscribeNewsletter(email);
      }

      res.redirect('/main');
    } catch (error) {
      logger.error(`뉴스레터 구독 해제 실패: [email: ${req.query.email}]`, error);
      next(error);
    }
  };
}
