import { UserWithTokenDto } from 'src/types/dto/user-with-token.dto';
import { UserService } from '../services/user.service';
import { Request, Response } from 'express';

export class UserController {
  constructor(private userService: UserService) {}

  login = async (req: Request, res: Response) => {
    const { id, email } = req.user;
    const { accessToken, refreshToken } = req.tokens;

    const userWithToken: UserWithTokenDto = { id, email, accessToken, refreshToken };
    const isExistUser = await this.userService.handleUserTokensByVelogUUID(userWithToken);
    res.status(200).json({ data: isExistUser });
  };
}
