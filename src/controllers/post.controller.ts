import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '../configs/logger.config';
import { PostService } from '../services/post.service';

export class PostController {
  constructor(private postService: PostService) {}

  getAll = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.status(200).json({
        success: true,
        message: '',
        data: {},
        error: null,
      });
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;
}
