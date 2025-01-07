import logger from '@/configs/logger.config';
import { BadRequestError } from '@/exception';
import { PostRepository } from '@/repositories/post.repository';

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

  async getPost(postId: string, start?: string, end?: string) {
    try {
      let posts;

      const isUUID = postId.length === 36 && postId.split('-').length === 5;

      if (isUUID) {
        if (!start || !end) {
          throw new BadRequestError('올바르지 않은 요청입니다.');
        }
        posts = await this.postRepo.findPostByUUID(postId, start, end);
      } else {
        posts = await this.postRepo.findPostByPostId(postId, start, end);
      }
      const transformedPosts = posts.map((post) => ({
        date: post.date,
        dailyViewCount: parseInt(post.daily_view_count),
        dailyLikeCount: parseInt(post.daily_like_count),
      }));

      return transformedPosts;
    } catch (error) {
      logger.error('PostService getPost error : ', error);
      throw error;
    }
  }
}
