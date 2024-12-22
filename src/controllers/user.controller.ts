import { NextFunction, Request, Response, RequestHandler } from 'express';
import logger from '../configs/logger.config';
import { UserWithTokenDto } from '../types';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) {}

  login = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, email, profile, username } = req.user;
      const { accessToken, refreshToken } = req.tokens;

      const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
      const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);

      // 만료 시간은 임시
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1 * 60 * 60 * 1000, // 1시간
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
      });

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
