import { NextFunction, Request, Response, RequestHandler } from 'express';
import logger from '../configs/logger.config';
import { UserWithTokenDto } from '../types';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) { }

  // private cookieOption(): (res: Response) => object {
  // }

  login = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, email, profile, username } = req.user;
      const { accessToken, refreshToken } = req.tokens;

      const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
      const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);

      if (process.env.NODE_ENV === 'production') {
        res.cookie('access_token', accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          domain: process.env.COOKIE_DOMAIN,
          maxAge: 1 * 60 * 60 * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          domain: process.env.COOKIE_DOMAIN,
          maxAge: 14 * 24 * 60 * 60 * 1000,
        });
      }
      else {
        res.cookie('access_token', accessToken, {
          secure: false,
          domain: 'localhost',
          maxAge: 1 * 60 * 60 * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
          secure: false,
          domain: 'localhost',
          maxAge: 14 * 24 * 60 * 60 * 1000,
        });
      }

      return res.status(200).json({
        success: true,
        message: '로그인에 성공하였습니다.',
        data: { id: isExistUser.id, username, profile },
        error: null,
      });
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;
}
