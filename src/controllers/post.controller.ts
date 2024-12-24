import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '../configs/logger.config';
import { PostService } from '../services/post.service';

interface PostType {
  id: number;
  title: string;
  views: number;
  likes: number;
  createdAt: string;
}

interface PostResponse {
  success: boolean;
  message: string;
  data: {
    totalCounts: number;
    nextCursor: string | null;
    posts: PostType[];
  } | null;
  error: string | null;
}

interface GetAllPostsQuery {
  cursor?: string;
  sort?: '' | 'title' | 'daily_view_count' | 'daily_like_count';
  asc?: string;
}

export class PostController {
  constructor(private postService: PostService) { }

  private validateQueryParams(query: GetAllPostsQuery): {
    cursor: string | undefined;
    sort: string;
    isAsc: boolean;
  } {
    return {
      cursor: query.cursor,
      sort: query.sort || '',
      isAsc: query.asc === 'true'
    };
  }

  getAllPost: RequestHandler = async (
    req: Request<object, object, object, GetAllPostsQuery>,
    res: Response<PostResponse>,
    next: NextFunction
  ) => {
    try {
      const { id } = req.user;
      const { cursor, sort, isAsc } = this.validateQueryParams(req.query);

      const result = await this.postService.getAllposts(id, cursor, sort, isAsc);

      res.status(200).json({
        success: true,
        message: 'post 전체 조회에 성공하였습니다.',
        data: {
          totalCounts: result.totalCounts,
          nextCursor: result.nextCursor,
          posts: result.posts
        },
        error: null
      });
    } catch (error) {
      logger.error('전체 조회 실패:', error);
      next(error);
    }
  };
}