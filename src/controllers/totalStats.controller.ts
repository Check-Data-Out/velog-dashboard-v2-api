import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { GetTotalStatsQuery, TotalStatsResponseDto } from '@/types';
import { TotalStatsService } from '@/services/totalStats.service';

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
}
