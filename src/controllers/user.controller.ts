import { NextFunction, Request, Response, RequestHandler, CookieOptions } from 'express';
import logger from '@/configs/logger.config';
import { EmptyResponseDto, LoginResponseDto, UserWithTokenDto } from '@/types';
import { UserService } from '@/services/user.service';
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

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

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

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

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
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

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
}
