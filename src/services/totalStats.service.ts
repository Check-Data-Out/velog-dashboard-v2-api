import logger from '@/configs/logger.config';
import { NotFoundError } from '@/exception';
import { TotalStatsPeriod, TotalStatsType, TotalStatsItem, BadgeData } from '@/types';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';
import { cache } from '@/configs/cache.config';
import { RedisCache } from '@/modules/cache/redis.cache';

const safeNumber = (value: string | number | null | undefined, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

const BADGE_DATE_RANGE = 30;

export const BADGE_CACHE_TTL = 60 * 10;

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

  getSuccessMessage(type: TotalStatsType = 'view'): string {
    const messages = {
      view: '전체 조회수 변동 조회에 성공하였습니다.',
      like: '전체 좋아요 변동 조회에 성공하였습니다.',
      post: '전체 게시글 변동 조회에 성공하였습니다.',
    };
    return messages[type];
  }

  async getBadgeData(username: string, type: 'default' | 'simple' = 'default'): Promise<BadgeData> {
    try {
      const cacheKey = `badge:${username}:${type}`;

      const cached = await cache.get<BadgeData>(cacheKey);
      if (cached) {
        logger.info(`[Cache HIT] ${cacheKey}`)
        return cached;
      }

      logger.info(`[Cache MISS] ${cacheKey}`)

      const userStats = await this.totalStatsRepo.getUserBadgeStats(username, BADGE_DATE_RANGE);

      if (!userStats) {
        throw new NotFoundError(`사용자를 찾을 수 없습니다: ${username}`);
      }

      const recentPosts =
        type === 'default' ? await this.totalStatsRepo.getUserRecentPosts(username, BADGE_DATE_RANGE, 4) : [];

      const result: BadgeData = {
        user: {
          username: userStats.username,
          totalViews: safeNumber(userStats.total_views),
          totalLikes: safeNumber(userStats.total_likes),
          totalPosts: safeNumber(userStats.total_posts),
          viewDiff: safeNumber(userStats.view_diff),
          likeDiff: safeNumber(userStats.like_diff),
          postDiff: safeNumber(userStats.post_diff),
        },
        recentPosts: recentPosts.map((post) => ({
          title: post.title,
          releasedAt: post.released_at,
          viewCount: safeNumber(post.today_view),
          likeCount: safeNumber(post.today_like),
          viewDiff: safeNumber(post.view_diff),
        })),
      };

      await cache.set(cacheKey, result, BADGE_CACHE_TTL);
      
      return result;
    } catch (error) {
      logger.error('TotalStatsService getBadgeData error: ', error);
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
}
