import logger from '../configs/logger.config';
import { PostRepository } from '../repositories/post.repository';

export class PostService {
  constructor(private postRepo: PostRepository) {}

  async getAllposts(id: number, cursor?: string, sort?: string, isAsc?: boolean, limit: number = 15) {
    try {
      const result = await this.postRepo.findPostsByUserId(id, cursor, sort, isAsc, limit);

      const transformedPosts = result.posts.map((post) => ({
        id: post.id,
        title: post.title,
        views: post.daily_view_count,
        likes: post.daily_like_count,
        yesterdayViews: post.yesterday_daily_view_count,
        yesterdayLikes: post.yesterday_daily_like_count,
        createdAt: post.post_created_at,
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

  async getTotalCount(id: number) {
    return await this.postRepo.getTotalCounts(id);
  }
}
