import { NextFunction, Request, Response, RequestHandler, CookieOptions } from 'express';
import logger from '../configs/logger.config';
import { LoginResponse, UserWithTokenDto } from '../types';
import { UserService } from '../services/user.service';
export class UserController {
  constructor(private userService: UserService) {}

  private cookieOption(maxAge: number): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';

    const baseOptions: CookieOptions = {
      httpOnly: isProd,
      secure: isProd,
      domain: process.env.COOKIE_DOMAIN || 'localhost',
      maxAge,
    };

    if (isProd) {
      baseOptions.sameSite = 'lax';
    }

    return baseOptions;
  }

  login: RequestHandler = async (req: Request, res: Response<LoginResponse>, next: NextFunction): Promise<void> => {
    try {
      const { id, email, profile, username } = req.user;
      const { accessToken, refreshToken } = req.tokens;

      const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
      const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      res.cookie('access_token', accessToken, this.cookieOption(1 * 60 * 60 * 1000));
      res.cookie('refresh_token', refreshToken, this.cookieOption(14 * 24 * 60 * 60 * 1000));

      res.status(200).json({
        success: true,
        message: '로그인에 성공하였습니다.',
        data: { id: isExistUser.id, username, profile },
        error: null,
      });
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  };

  logout: RequestHandler = async (req: Request, res: Response) => {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.status(200).json({ success: true, message: '로그아웃에 성공하였습니다.', data: {}, error: null });
  };
}
