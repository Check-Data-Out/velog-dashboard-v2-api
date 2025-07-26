import { cache } from '@/configs/cache.config';
import logger from '@/configs/logger.config';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import {
  UserLeaderboardSortType,
  PostLeaderboardSortType,
  UserLeaderboardData,
  PostLeaderboardData,
} from '@/types/index';

export const LEADERBOARD_CACHE_TTL = 60 * 30; // 30분

export class LeaderboardService {
  constructor(private leaderboardRepo: LeaderboardRepository) {}

  async getUserLeaderboard(
    sort: UserLeaderboardSortType = 'viewCount',
    dateRange: number = 30,
    limit: number = 10,
  ): Promise<UserLeaderboardData> {
    try {
      const cacheKey = `leaderboard:user:${sort}:${dateRange}:${limit}`;
      const cachedResult = await cache.get(cacheKey);

      if (cachedResult) {
        return cachedResult as UserLeaderboardData;
      }

      const rawResult = await this.leaderboardRepo.getUserLeaderboard(sort, dateRange, limit);
      const result = this.mapRawUserResult(rawResult);
      cache.set(cacheKey, result, LEADERBOARD_CACHE_TTL);

      return result;
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
      const cacheKey = `leaderboard:post:${sort}:${dateRange}:${limit}`;
      const cachedResult = await cache.get(cacheKey);

      if (cachedResult) {
        return cachedResult as PostLeaderboardData;
      }

      const rawResult = await this.leaderboardRepo.getPostLeaderboard(sort, dateRange, limit);
      const result = this.mapRawPostResult(rawResult);
      cache.set(cacheKey, result, LEADERBOARD_CACHE_TTL);

      return result;
    } catch (error) {
      logger.error('LeaderboardService getPostLeaderboard error : ', error);
      throw error;
    }
  }

  private mapRawUserResult(rawResult: RawUserResult[]): UserLeaderboardData {
    const users = rawResult.map((user) => ({
      id: user.id,
      email: user.email || null,
      username: user.username,
      totalViews: Number(user.total_views),
      totalLikes: Number(user.total_likes),
      totalPosts: Number(user.total_posts),
      viewDiff: Number(user.view_diff),
      likeDiff: Number(user.like_diff),
      postDiff: Number(user.post_diff),
    }));

    return { users };
  }

  private mapRawPostResult(rawResult: RawPostResult[]): PostLeaderboardData {
    const posts = rawResult.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      username: post.username || null,
      totalViews: Number(post.total_views),
      totalLikes: Number(post.total_likes),
      viewDiff: Number(post.view_diff),
      likeDiff: Number(post.like_diff),
      releasedAt: post.released_at,
    }));

    return { posts };
  }
}

interface RawUserResult {
  id: string;
  email: string | null;
  username: string;
  total_views: string;
  total_likes: string;
  total_posts: string;
  view_diff: string;
  like_diff: string;
  post_diff: string;
}

interface RawPostResult {
  id: string;
  title: string;
  slug: string;
  username: string | null;
  total_views: string;
  total_likes: string;
  view_diff: string;
  like_diff: string;
  released_at: string;
}
