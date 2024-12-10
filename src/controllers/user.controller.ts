import { NextFunction, Request, Response, RequestHandler } from 'express';
import logger from '../configs/logger.config';
import { UserWithTokenDto } from '../types/dto/userWithToken.dto';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) {}

  login = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, email, profile } = req.user;
      const { accessToken, refreshToken } = req.tokens;

      const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
      const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);
      return res.status(200).json({
        success: true,
        message: '로그인에 성공하였습니다.',
        data: { id: isExistUser.id, email: isExistUser.email, profile },
      });
    } catch (error) {
      logger.error('로그인 실패', error);
      next(error);
    }
  }) as RequestHandler;
}
