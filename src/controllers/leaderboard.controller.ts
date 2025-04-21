import logger from '@/configs/logger.config';
import { LeaderboardService } from '@/services/leaderboard.service';
import { GetLeaderboardQuery } from '@/types/dto/requests/getLeaderboardQuery.type';
import { LeaderboardResponseDto } from '@/types/dto/responses/leaderboardResponse.type';
import { NextFunction, RequestHandler, Request, Response } from 'express';

export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  getLeaderboard: RequestHandler = async (
    req: Request<object, object, object, GetLeaderboardQuery>,
    res: Response<LeaderboardResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { type, sort, dateRange, limit } = req.query;

      const result = await this.leaderboardService.getLeaderboard(type, sort, dateRange, limit);
      const response = new LeaderboardResponseDto(true, '리더보드 조회에 성공하였습니다.', result, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('리더보드 조회 실패:', error);
      next(error);
    }
  };
}
