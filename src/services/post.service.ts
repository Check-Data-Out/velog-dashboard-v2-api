import { PostRepository } from '../repositories/post.repository';

export class PostService {
  constructor(private postRepo: PostRepository) {}
}
