import { UserWithTokenDto } from 'src/types/dto/user-with-token.dto';
import { UserService } from '../services/user.service';
import { Request, Response } from 'express';

export class UserController {
  constructor(private userService: UserService) {}

  // TODO : 추후 대쉬보드의 필요한 정보에 따라 리팩토링 진행
  login = async (req: Request, res: Response) => {
    const { id, email } = req.user;
    const { accessToken, refreshToken } = req.tokens;

    const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
    const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);
    res.status(200).json({ data: isExistUser });
  };

  verify = async (req: Request, res: Response) => {
    const { id, email } = req.user;
    const { accessToken, refreshToken } = req.tokens;

    const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
    const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);
    res.status(200).json({ data: isExistUser });
  };
}
