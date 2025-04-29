import logger from '@/configs/logger.config';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import {
  UserLeaderboardSortType,
  PostLeaderboardSortType,
  UserLeaderboardData,
  PostLeaderboardData,
} from '@/types/index';

export class LeaderboardService {
  constructor(private leaderboardRepo: LeaderboardRepository) {}

  async getUserLeaderboard(
    sort: UserLeaderboardSortType = 'viewCount',
    dateRange: number = 30,
    limit: number = 10,
  ): Promise<UserLeaderboardData> {
    try {
      const rawResult = await this.leaderboardRepo.getUserLeaderboard(sort, dateRange, limit);
      return this.mapRawUserResult(rawResult);
    } catch (error) {
      logger.error('LeaderboardService getUserLeaderboard error : ', error);
      throw error;
    }
  }

  async getPostLeaderboard(
    sort: PostLeaderboardSortType = 'viewCount',
    dateRange: number = 30,
    limit: number = 10,
  ): Promise<PostLeaderboardData> {
    try {
      const rawResult = await this.leaderboardRepo.getPostLeaderboard(sort, dateRange, limit);
      return this.mapRawPostResult(rawResult);
    } catch (error) {
      logger.error('LeaderboardService getPostLeaderboard error : ', error);
      throw error;
    }
  }

  private mapRawUserResult(rawResult: RawUserResult[]): UserLeaderboardData {
    const users = rawResult.map((user) => ({
      id: user.id,
      email: user.email,
      totalViews: user.total_views,
      totalLikes: user.total_likes,
      totalPosts: user.total_posts,
      viewDiff: user.view_diff,
      likeDiff: user.like_diff,
      postDiff: user.post_diff,
    }));

    return { users };
  }

  private mapRawPostResult(rawResult: RawPostResult[]): PostLeaderboardData {
    const posts = rawResult.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      totalViews: post.total_views,
      totalLikes: post.total_likes,
      viewDiff: post.view_diff,
      likeDiff: post.like_diff,
      releasedAt: post.released_at,
    }));

    return { posts };
  }
}

interface RawPostResult {
  id: string;
  title: string;
  slug: string;
  total_views: number;
  total_likes: number;
  view_diff: number;
  like_diff: number;
  released_at: string;
}

interface RawUserResult {
  id: string;
  email: string;
  total_views: number;
  total_likes: number;
  total_posts: number;
  view_diff: number;
  like_diff: number;
  post_diff: number;
}
