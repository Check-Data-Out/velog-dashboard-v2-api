import logger from '@/configs/logger.config';
import { NotFoundError } from '@/exception';
import { TotalStatsPeriod, TotalStatsType, TotalStatsItem, BadgeData } from '@/types';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';

const safeNumber = (value: string | number | null | undefined, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

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

  async getBadgeData(username: string, dateRange: number = 30): Promise<BadgeData> {
    try {
      const userStats = await this.totalStatsRepo.getUserBadgeStats(username, dateRange);
      if (!userStats) {
        throw new NotFoundError(`사용자를 찾을 수 없습니다: ${username}`);
      }

      const recentPosts = await this.totalStatsRepo.getUserRecentPosts(username, dateRange, 4);

      return {
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
    } catch (error) {
      logger.error('TotalStatsService getBadgeData error: ', error);
      throw error;
    }
  }
}
