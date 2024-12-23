import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '../configs/logger.config';
import { PostService } from '../services/post.service';

export class PostController {
  constructor(private postService: PostService) {}
  getAllPost = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user;
      const cursor = req.query?.cursor as string;
      const { posts, totalCounts, nextCursor } = await this.postService.getAllposts(id, cursor);

      return res.status(200).json({
        success: true,
        message: 'post 전체 조회에 성공하였습니다.',
        data: { totalCounts, nextCursor, posts },
        error: null,
      });
    } catch (error) {
      logger.error('전체 조회 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;
}
