import { PostRepository } from '../repositories/post.repository';

export class PostService {
  constructor(private postRepo: PostRepository) {}

  async getAllpost(id: number) {
    // todo : totalCounts , nextPage
    return await this.postRepo.findPostsByUserId(id);
  }
}
