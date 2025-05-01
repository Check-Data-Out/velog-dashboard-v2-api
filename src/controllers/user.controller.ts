import { NextFunction, Request, Response, RequestHandler, CookieOptions } from 'express';
import logger from '@/configs/logger.config';
import { EmptyResponseDto, LoginResponseDto, UserWithTokenDto } from '@/types';
import { QRLoginTokenResponseDto } from '@/types/dto/responses/qrResponse.type';
import { UserService } from '@/services/user.service';
import { InvalidTokenError, TokenExpiredError } from '@/exception/token.exception';
import { NotFoundError } from '@/exception';

type Token10 = string & { __lengthBrand: 10 };

export class UserController {
  constructor(private userService: UserService) { }

  private cookieOption(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';

    const baseOptions: CookieOptions = {
      httpOnly: isProd,
      secure: isProd,
    };

    if (isProd) {
      baseOptions.sameSite = 'lax';
      baseOptions.domain = "velog-dashboard.kro.kr";
    } else {
      baseOptions.domain = 'localhost';
    }

    return baseOptions;
  }

  login: RequestHandler = async (req: Request, res: Response<LoginResponseDto>, next: NextFunction): Promise<void> => {
    try {
      const { id, email, profile, username } = req.user;
      const { accessToken, refreshToken } = req.tokens;

      const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
      const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);

      res.clearCookie('access_token', this.cookieOption());
      res.clearCookie('refresh_token', this.cookieOption());

      res.cookie('access_token', accessToken, this.cookieOption());
      res.cookie('refresh_token', refreshToken, this.cookieOption());

      const response = new LoginResponseDto(
        true,
        '로그인에 성공하였습니다.',
        { id: isExistUser.id, username, profile },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  };

  sampleLogin: RequestHandler = async (req: Request, res: Response<LoginResponseDto>, next: NextFunction): Promise<void> => {
    try {
      const sampleUser = await this.userService.findSampleUser();

      res.clearCookie('access_token', this.cookieOption());
      res.clearCookie('refresh_token', this.cookieOption());

      res.cookie('access_token', sampleUser.decryptedAccessToken, this.cookieOption());
      res.cookie('refresh_token', sampleUser.decryptedRefreshToken, this.cookieOption());

      req.user = sampleUser.user;

      const response = new LoginResponseDto(
        true,
        '로그인에 성공하였습니다.',
        {
          id: sampleUser.user.id,
          username: "테스트 유저",
          profile: { "thumbnail": "https://velog.io/favicon.ico" }
        },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  }

  logout: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>) => {
    res.clearCookie('access_token', this.cookieOption());
    res.clearCookie('refresh_token', this.cookieOption());

    const response = new EmptyResponseDto(true, '로그아웃에 성공하였습니다.', {}, null);

    res.status(200).json(response);
  };

  fetchCurrentUser: RequestHandler = (req: Request, res: Response<LoginResponseDto>) => {
    const { user } = req;

    const response = new LoginResponseDto(
      true,
      '유저 정보 조회에 성공하였습니다.',
      { id: user.id, username: user.username, profile: user.profile },
      null,
    );

    res.status(200).json(response);
  };

  createToken: RequestHandler = async (
    req: Request,
    res: Response<QRLoginTokenResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const user = req.user;
      const ip = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip ?? '';
      const userAgent = req.headers['user-agent'] || '';

      const token = await this.userService.create(user.id, ip, userAgent);
      const typedToken = token as Token10;

      const response = new QRLoginTokenResponseDto(
        true,
        'QR 토큰 생성 완료',
        { token: typedToken },
        null
      );
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
        throw new InvalidTokenError('토큰이 필요합니다.');
      }

      const found = await this.userService.useToken(token);
      if (!found) {
        throw new TokenExpiredError();
      }

      const user = await this.userService.findByVelogUUID(found.user.toString());
      if (!user) throw new NotFoundError('유저를 찾을 수 없습니다.');

      const { decryptedAccessToken, decryptedRefreshToken } = this.userService.getDecryptedTokens(  
        user.group_id,  
        user.access_token,  
        user.refresh_token  
      );

      res.clearCookie('access_token', this.cookieOption());
      res.clearCookie('refresh_token', this.cookieOption());

      res.cookie('access_token', decryptedAccessToken, this.cookieOption());
      res.cookie('refresh_token', decryptedRefreshToken, this.cookieOption());

      res.redirect('/main');
    } catch (error) {
      logger.error(`QR 토큰 로그인 처리 실패: [userId: ${req.user?.id || 'anonymous'}]`, error);
      next(error);
    }
  };
}
