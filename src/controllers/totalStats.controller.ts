import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { GetTotalStatsQuery, TotalStatsResponseDto, BadgeDataResponseDto } from '@/types';
import { TotalStatsService } from '@/services/totalStats.service';

interface BadgeParams {
  username: string;
}

interface BadgeQuery {
  type?: 'default' | 'simple';
}

export class TotalStatsController {
  constructor(private totalStatsService: TotalStatsService) {}

  getTotalStats: RequestHandler = async (
    req: Request<object, object, object, GetTotalStatsQuery>,
    res: Response<TotalStatsResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.user;
      const { period, type } = req.query;

      const stats = await this.totalStatsService.getTotalStats(id, period, type);
      const message = this.totalStatsService.getSuccessMessage(type);

      const response = new TotalStatsResponseDto(true, message, stats, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('전체 통계 조회 실패:', error);
      next(error);
    }
  };

  getBadge: RequestHandler<BadgeParams, BadgeDataResponseDto, object, BadgeQuery> = async (
    req: Request<BadgeParams, BadgeDataResponseDto, object, BadgeQuery>,
    res: Response<BadgeDataResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { username } = req.params;
      const { type = 'default' } = req.query;

      const data = await this.totalStatsService.getBadgeData(username, type);
      const response = new BadgeDataResponseDto(true, '배지 데이터 조회에 성공하였습니다.', data, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('배지 데이터 조회 실패:', error);
      next(error);
    }
  };
}
