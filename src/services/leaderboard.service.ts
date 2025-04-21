import logger from '@/configs/logger.config';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { LeaderboardResponseData } from '@/types/dto/responses/leaderboardResponse.type';

export class LeaderboardService {
  constructor(private leaderboardRepo: LeaderboardRepository) {}

  async getLeaderboard(
    type: string = 'user',
    sort: string = 'viewCount',
    dateRange: number = 30,
    limit: number = 10,
  ): Promise<LeaderboardResponseData> {
    try {
      const rawResult = await this.leaderboardRepo.getLeaderboard(type, sort, dateRange, limit);
      const result = this.mapRawResultToLeaderboardResponseData(rawResult, type);

      return result;
    } catch (error) {
      logger.error('LeaderboardService getLeaderboard error : ', error);
      throw error;
    }
  }

  private mapRawResultToLeaderboardResponseData(rawResult: unknown[], type: string): LeaderboardResponseData {
    const result = { posts: null, users: null };

    if (type === 'post') {
      result.posts = rawResult.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        totalViews: post.total_views,
        totalLikes: post.total_likes,
        viewDiff: post.view_diff,
        likeDiff: post.like_diff,
        releasedAt: post.released_at,
      }));
    } else {
      result.users = rawResult.map((user) => ({
        id: user.id,
        email: user.email,
        totalViews: user.total_views,
        totalLikes: user.total_likes,
        totalPosts: user.total_posts,
        viewDiff: user.view_diff,
        likeDiff: user.like_diff,
        postDiff: user.post_diff,
      }));
    }

    return result;
  }
}
