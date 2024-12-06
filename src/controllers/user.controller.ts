import { UserWithTokenDto } from '../types/dto/user-with-token.dto';
import { UserService } from '../services/user.service';
import { NextFunction, Request, Response } from 'express';
import logger from '../configs/logger.config';

export class UserController {
  constructor(private userService: UserService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, email } = req.user;
      const { accessToken, refreshToken } = req.tokens;

      const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
      const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);
      res.status(200).json({ success: 'true', data: isExistUser });
    } catch (error) {
      logger.error('로그인 실패', error);
      next(error);
    }
  };
}
