import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '../configs/logger.config';
import { PostService } from '../services/post.service';
import { GetAllPostsQuery, PostResponse } from '../types';
import { GetPostQuery } from 'src/types/requests/getPostQuery.type';

export class PostController {
  constructor(private postService: PostService) {}

  private validateQueryParams(query: GetAllPostsQuery): {
    cursor: string | undefined;
    sort: string;
    isAsc: boolean;
  } {
    return {
      cursor: query.cursor,
      sort: query.sort || '',
      isAsc: query.asc === 'true',
    };
  }
  private validateQueryParams2(query: Partial<GetPostQuery>): {
    start: string;
    end: string;
  } {
    return {
      start: query.start || '',
      end: query.end || '',
    };
  }
  getAllPost: RequestHandler = async (
    req: Request<object, object, object, GetAllPostsQuery>,
    res: Response<PostResponse>,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.user;
      const { cursor, sort, isAsc } = this.validateQueryParams(req.query);

      const result = await this.postService.getAllposts(id, cursor, sort, isAsc);

      res.status(200).json({
        success: true,
        message: 'post 전체 조회에 성공하였습니다.',
        data: {
          nextCursor: result.nextCursor,
          posts: result.posts,
        },
        error: null,
      });
    } catch (error) {
      logger.error('전체 조회 실패:', error);
      next(error);
    }
  };

  getAllPostStatistics: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user;

      const result = await this.postService.getAllPostStatistics(id);
      const totalPostCount = await this.postService.getTotalPostCounts(id);

      res.status(200).json({
        success: true,
        message: 'post 전체 통계 조회에 성공하였습니다.',
        data: { totalPostCount, stats: result },
        error: null,
      });
    } catch (error) {
      logger.error('전체 통계 조회 실패:', error);
      next(error);
    }
  };

  getPost: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const postId = parseInt(req.params.postId);
      const { start, end } = this.validateQueryParams2(req.query);
      const post = await this.postService.getPost(postId, start, end);
      res.status(200).json({
        success: true,
        message: 'post 단건 조회에 성공하였습니다',
        data: { post },
        error: null,
      });
    } catch (error) {
      logger.error('단건 조회 실패 : ', error);
      next(error);
    }
  };
}
