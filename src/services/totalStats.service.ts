import logger from '@/configs/logger.config';
import { TotalStatsPeriod, TotalStatsType, TotalStatsItem } from '@/types';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';

export class TotalStatsService {
  constructor(private totalStatsRepo: TotalStatsRepository) {}

  async getTotalStats(
    userId: number,
    period: TotalStatsPeriod = 7,
    type: TotalStatsType = 'view',
  ): Promise<TotalStatsItem[]> {
    try {
      const rawStats = await this.totalStatsRepo.getTotalStats(userId, period, type);

      return rawStats.map((stat) => ({
        date: stat.date,
        value: Number(stat.total_value),
      }));
    } catch (error) {
      logger.error('TotalStatsService getTotalStats error:', error);
      throw error;
    }
  }

  getSuccessMessage(type: TotalStatsType = 'view'): string {
    const messages = {
      view: '전체 조회수 변동 조회에 성공하였습니다.',
      like: '전체 좋아요 변동 조회에 성공하였습니다.',
      post: '전체 게시글 변동 조회에 성공하였습니다.',
    };
    return messages[type];
  }
}
