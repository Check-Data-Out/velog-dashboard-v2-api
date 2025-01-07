import logger from '@/configs/logger.config';
import { PostRepository } from '@/repositories/post.repository';
import { RawPostType } from '@/types';

export class PostService {
  constructor(private postRepo: PostRepository) {}

  async getAllposts(userId: number, cursor?: string, sort: string = '', isAsc?: boolean, limit: number = 15) {
    try {
      const result = await this.postRepo.findPostsByUserId(userId, cursor, sort, isAsc, limit);

      const transformedPosts = result.posts.map((post) => ({
        id: post.id,
        title: post.title,
        views: post.daily_view_count,
        likes: post.daily_like_count,
        yesterdayViews: post.yesterday_daily_view_count,
        yesterdayLikes: post.yesterday_daily_like_count,
        createdAt: post.post_created_at,
        releasedAt: post.post_released_at,
      }));

      return {
        posts: transformedPosts,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      logger.error('PostService getAllpost error : ', error);
      throw error;
    }
  }

  async getAllPostStatistics(userId: number) {
    try {
      const postsStatistics = await this.postRepo.getYesterdayAndTodayViewLikeStats(userId);

      const transformedStatistics = {
        totalViews: parseInt(postsStatistics.daily_view_count),
        totalLikes: parseInt(postsStatistics.daily_like_count),
        yesterdayViews: parseInt(postsStatistics.yesterday_views),
        yesterdayLikes: parseInt(postsStatistics.yesterday_likes),
        lastUpdatedDate: postsStatistics.last_updated_date,
      };

      return transformedStatistics;
    } catch (error) {
      logger.error('PostService getAllPostStatistics error : ', error);
      throw error;
    }
  }

  async getTotalPostCounts(id: number) {
    return await this.postRepo.getTotalPostCounts(id);
  }

  async getPostByPostId(postId: number, start?: string, end?: string) {
    try {
      const posts = await this.postRepo.findPostByPostId(postId, start, end);

      const transformedPosts = this.transformPosts(posts);

      return transformedPosts;
    } catch (error) {
      logger.error('PostService getPost error : ', error);
      throw error;
    }
  }

  async getPostByPostUUID(postId: string) {
    try {
      const seoulNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(seoulNow);

      const end = seoulNow.toISOString().split('T')[0];
      sevenDaysAgo.setDate(seoulNow.getDate() - 6);
      const start = sevenDaysAgo.toISOString().split('T')[0];

      const posts = await this.postRepo.findPostByPostUUID(postId, start, end);

      const transformedPosts = this.transformPosts(posts);

      return transformedPosts;
    } catch (error) {
      logger.error('PostService getPost error : ', error);
      throw error;
    }
  }

  private transformPosts(posts: RawPostType[]) {
    return posts.map((post) => ({
      date: post.date,
      dailyViewCount: post.daily_view_count,
      dailyLikeCount: post.daily_like_count,
    }));
  }
}
