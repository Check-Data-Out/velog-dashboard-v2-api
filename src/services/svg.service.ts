import logger from '@/configs/logger.config';
import { SvgBadgeType, BadgeData } from '@/types';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';

const safeNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

export class SvgService {
  constructor(private leaderboardRepo: LeaderboardRepository) {}

  async getBadgeData(username: string, type: SvgBadgeType, dateRange: number = 30): Promise<BadgeData> {
    try {
      const userStats = await this.leaderboardRepo.getUserStats(username, dateRange);
      const recentPosts = type === 'default' ? await this.leaderboardRepo.getRecentPosts(username, dateRange, 3) : [];

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
      logger.error('SvgService getBadgeData error: ', error);
      throw error;
    }
  }
}
