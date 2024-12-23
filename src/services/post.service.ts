import logger from '../configs/logger.config';
import { PostRepository } from '../repositories/post.repository';

export class PostService {
  constructor(private postRepo: PostRepository) {}

  async getAllpost(id: number, cursor?: string, limit: number = 5) {
    // todo : totalCounts , nextPage
    try {
      const result = await this.postRepo.findPostsByUserId(id, cursor, limit);
      const totalCounts = await this.getTotalCount(id);

      const transformedPosts = result.posts.map((post) => ({
        id: post.id,
        title: post.title,
        date: post.updated_at,
        views: post.daily_view_count,
        likes: post.daily_like_count,
      }));

      return {
        posts: transformedPosts,
        totalCounts,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      logger.error('PostService getAllpost error:', error);
      throw error;
    }
  }

  private async getTotalCount(id: number) {
    return await this.postRepo.getTotalCounts(id);
  }
}
