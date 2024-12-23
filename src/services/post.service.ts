import logger from '../configs/logger.config';
import { PostRepository } from '../repositories/post.repository';

export class PostService {
  constructor(private postRepo: PostRepository) {}

  async getAllpost(id: number, cursor?: string, limit: number = 5) {
    // todo : totalCounts , nextPage
    try {
      const result = await this.postRepo.findPostsByUserId(id, cursor, limit);
      const totalCounts = await this.getTotalCount(id);

      return {
        posts: result.posts,
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
