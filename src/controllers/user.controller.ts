import { UserService } from '../services/user.service';
import { Request, Response } from 'express';

export class UserController {
  constructor(private userService: UserService) {}

  velogApi = async (req: Request, res: Response): Promise<void> => {
    res.status(400).json({ message: 'good' });
  };
}
