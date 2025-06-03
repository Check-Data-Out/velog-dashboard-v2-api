import logger from '@/configs/logger.config';
import { NextFunction, RequestHandler, Request, Response } from 'express';
import { LeaderboardService } from '@/services/leaderboard.service';
import {
  GetUserLeaderboardQuery,
  GetPostLeaderboardQuery,
  UserLeaderboardResponseDto,
  PostLeaderboardResponseDto,
} from '@/types';

export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  getUserLeaderboard: RequestHandler = async (
    req: Request<object, object, object, GetUserLeaderboardQuery>,
    res: Response<UserLeaderboardResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { sort, dateRange, limit } = req.query;

      const users = await this.leaderboardService.getUserLeaderboard(sort, dateRange, limit);
      const response = new UserLeaderboardResponseDto(true, '사용자 리더보드 조회에 성공하였습니다.', users, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('사용자 리더보드 조회 실패:', error);
      next(error);
    }
  };

  getPostLeaderboard: RequestHandler = async (
    req: Request<object, object, object, GetPostLeaderboardQuery>,
    res: Response<PostLeaderboardResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { sort, dateRange, limit } = req.query;

      const posts = await this.leaderboardService.getPostLeaderboard(sort, dateRange, limit);
      const response = new PostLeaderboardResponseDto(true, '게시물 리더보드 조회에 성공하였습니다.', posts, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('게시물 리더보드 조회 실패:', error);
      next(error);
    }
  };
}
