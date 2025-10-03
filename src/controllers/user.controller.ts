import { NextFunction, Request, Response, RequestHandler, CookieOptions } from 'express';
import logger from '@/configs/logger.config';
import { EmptyResponseDto, LoginResponseDto } from '@/types';
import { QRLoginTokenResponseDto } from '@/types/dto/responses/qrResponse.type';
import { UserService } from '@/services/user.service';
import { fetchVelogApi } from '@/modules/velog/velog.api';
import { QRTokenExpiredError, QRTokenInvalidError, BadRequestError } from '@/exception';

type Token10 = string & { __lengthBrand: 10 };

const THREE_WEEKS_IN_MS = 21 * 24 * 60 * 60 * 1000;

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * 환경 및 쿠키 삭제 여부에 따라 쿠키 옵션을 생성합니다.
   *
   * @param isClear - true일 경우 쿠키 삭제용 옵션을 생성합니다. 기본값은 false입니다.
   * @returns 현재 환경에 맞게 설정된 CookieOptions 객체를 반환합니다.
   */
  private cookieOption(isClear: boolean = false): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    const options: CookieOptions = {
      httpOnly: isProd,
      secure: isProd,
      sameSite: isProd ? 'lax' : undefined,
      domain: isProd ? 'velog-dashboard.kro.kr' : 'localhost',
    };

    if (isProd && !isClear) {
      options.maxAge = THREE_WEEKS_IN_MS;
    }

    return options;
  }

  login: RequestHandler = async (req: Request, res: Response<LoginResponseDto>, next: NextFunction): Promise<void> => {
    try {
      // 1. 외부 API (velog) 호출로 실존 하는 토큰 & 사용자 인지 검증
      const { accessToken, refreshToken } = req.body;
      const velogUser = await fetchVelogApi(accessToken, refreshToken);

      // 2. 우리쪽 DB에 사용자 존재 여부 체크 후 로그인 바로 진행 또는 사용자 생성 후 로그인 진행
      const user = await this.userService.handleUserTokensByVelogUUID(velogUser, accessToken, refreshToken);

      // 3. 로그이 완료 후 쿠키 세팅
      res.clearCookie('access_token', this.cookieOption(true));
      res.clearCookie('refresh_token', this.cookieOption(true));

      res.cookie('access_token', accessToken, this.cookieOption());
      res.cookie('refresh_token', refreshToken, this.cookieOption());

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

      res.clearCookie('access_token', this.cookieOption(true));
      res.clearCookie('refresh_token', this.cookieOption(true));

      res.cookie('access_token', sampleUser.decryptedAccessToken, this.cookieOption());
      res.cookie('refresh_token', sampleUser.decryptedRefreshToken, this.cookieOption());

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
    res.clearCookie('access_token', this.cookieOption(true));
    res.clearCookie('refresh_token', this.cookieOption(true));

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

      res.clearCookie('access_token', this.cookieOption(true));
      res.clearCookie('refresh_token', this.cookieOption(true));

      res.cookie('access_token', userLoginToken.decryptedAccessToken, this.cookieOption());
      res.cookie('refresh_token', userLoginToken.decryptedRefreshToken, this.cookieOption());

      res.redirect('/main');
    } catch (error) {
      logger.error(`QR 토큰 로그인 처리 실패: [userId: ${req.user?.id || 'anonymous'}]`, error);
      next(error);
    }
  };

  unsubscribeNewsletter: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>, next: NextFunction) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        throw new BadRequestError('이메일이 필요합니다.');
      }

      await this.userService.unsubscribeNewsletter(email);
      res.redirect('/main');
    } catch (error) {
      logger.error(`뉴스레터 구독 해제 실패: [email: ${req.query.email}]`, error);
      next(error);
    }
  };
}
