import logger from '@/configs/logger.config';
import { TotalStatsPeriod, TotalStatsType, TotalStatsItem } from '@/types';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';
import { cache } from '@/configs/cache.config';
import { RedisCache } from '@/modules/cache/redis.cache';

export class TotalStatsService {
  private readonly STATS_REFRESH_INTERVAL = 15 * 60 * 1000; // 15분 (밀리초)
  private readonly MAIN_QUEUE_KEY = 'stats-refresh';
  private readonly PROCESSING_QUEUE_KEY = `${this.MAIN_QUEUE_KEY}:processing`;

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

  async refreshStats(
    userId: number,
  ): Promise<{ success: boolean; reason?: 'up-to-date' | 'in-progress'; lastUpdatedAt?: string }> {
    try {
      // 1. 가장 최근 updated_at 조회
      const latestUpdatedAt = await this.totalStatsRepo.getLatestUpdatedAt(userId);

      // 2. 15분 경과 확인
      if (latestUpdatedAt) {
        const now = new Date();
        const timeDiff = now.getTime() - new Date(latestUpdatedAt).getTime();

        if (timeDiff <= this.STATS_REFRESH_INTERVAL) {
          return { success: false, reason: 'up-to-date', lastUpdatedAt: latestUpdatedAt };
        }
      }

      // 3. Processing Queue에 userId 존재 확인
      const redisCache = cache as RedisCache;
      const isInProcessing = await redisCache.isUserInQueue(this.PROCESSING_QUEUE_KEY, userId);

      if (isInProcessing) {
        return { success: false, reason: 'in-progress' };
      }

      // 4. 메인 큐에 userId 등록
      const queueLength = await redisCache.pushToQueue(this.MAIN_QUEUE_KEY, {
        userId: userId,
        requestedAt: new Date().toISOString(),
        retryCount: 0,
      });

      if (queueLength === null) {
        logger.error('Failed to add job to Redis Queue');
        throw new Error('통계 새로고침 작업 등록에 실패했습니다.');
      }

      return { success: true };
    } catch (error) {
      logger.error('TotalStatsService refreshStats error:', error);
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
