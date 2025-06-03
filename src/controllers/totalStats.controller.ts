import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { BadRequestError } from '@/exception';
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

      // 미들웨어에서 GetTotalStatsQueryDto 에 의해 걸리는데 런타임과 IDE 에서 구분을 못함, 이를 위해 추가
      if (!type) throw new BadRequestError('type 파라미터가 필요합니다.');

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
