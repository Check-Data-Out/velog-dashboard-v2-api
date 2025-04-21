import { LeaderboardService } from '@/services/leaderboard.service';
import { NextFunction, RequestHandler, Request, Response } from 'express';

export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  getLeaderboard: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ message: 'ok' });
    } catch (error) {
      next(error);
    }
  };
}
