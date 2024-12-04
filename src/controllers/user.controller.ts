import { CustomRequest } from 'src/middlewares/auth.middleware';
import { UserService } from '../services/user.service';
import { Response } from 'express';

export class UserController {
  constructor(private userService: UserService) {}

  velogApi = async (req: CustomRequest, res: Response): Promise<void> => {
    console.log(req.user);
    console.log(req.body);
    res.status(200).json({ data: req.user });
  };
}
