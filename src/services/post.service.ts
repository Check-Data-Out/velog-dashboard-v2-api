import logger from '../configs/logger.config';
import { PostRepository } from '../repositories/post.repository';

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

  async getPost(postId: number, startDate?: string, endDate?: string) {
    const post = await this.postRepo.findPostByPostId(postId, startDate, endDate);
    return post;
  }
}
