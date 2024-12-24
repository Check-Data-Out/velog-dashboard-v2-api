import logger from '../configs/logger.config';
import { PostRepository } from '../repositories/post.repository';

export class PostService {
  constructor(private postRepo: PostRepository) {}

  async getAllposts(id: number, cursor?: string, sort?: string, isAsc?:boolean, limit: number = 5) {
    try {
      const result = await this.postRepo.findPostsByUserId(id, cursor, sort, isAsc, limit);
      const totalCounts = await this.getTotalCount(id);

      const transformedPosts = result.posts.map((post) => ({
        id: post.id,
        title: post.title,
        // date: post.updated_at,
        views: post.daily_view_count,
        likes: post.daily_like_count,
      }));

      return {
        posts: transformedPosts,
        totalCounts,
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
