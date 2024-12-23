import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '../configs/logger.config';
import { PostService } from '../services/post.service';

export class PostController {
  constructor(private postService: PostService) {}
  /**
 * {
  id: '129036-123512-590731-048113',
  title: '2024 스탠다드 회고록',
  date: '2024-12-15T13:06.16.325Z', // updatedAt
  total_views: 40234,
  views: 31,
  likes: 200,
},
 */
  getAllPost = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user;
      const cursor = req.query?.cursor as string;
      const { posts, totalCounts, nextCursor } = await this.postService.getAllpost(id, cursor);

      const transformedPosts = posts.map((post) => ({
        id: post.id,
        title: post.title,
        date: post.updated_at,
        views: post.daily_view_count,
        likes: post.daily_like_count,
      }));

      return res.status(200).json({
        success: true,
        message: 'post 전체 조회에 성공하였습니다.',
        data: { totalCounts, nextCursor, transformedPosts },
        error: null,
      });
    } catch (error) {
      logger.error('전체 조회 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;
}
