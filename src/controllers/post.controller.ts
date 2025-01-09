import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { PostService } from '@/services/post.service';
import {
  GetAllPostsQuery,
  PostsResponseDto,
  PostResponseDto,
  GetPostQuery,
  PostParam,
  PostStatisticsResponseDto,
} from '@/types';

export class PostController {
  constructor(private postService: PostService) {}

  getAllPost: RequestHandler = async (
    req: Request<object, object, object, GetAllPostsQuery>,
    res: Response<PostsResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.user;
      const { cursor, sort, asc } = req.query;

      const result = await this.postService.getAllposts(id, cursor, sort, asc);

      const response = new PostsResponseDto(
        true,
        '전체 post 조회에 성공하였습니다.',
        { nextCursor: result.nextCursor, posts: result.posts },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('전체 조회 실패:', error);
      next(error);
    }
  };

  getAllPostStatistics: RequestHandler = async (
    req: Request,
    res: Response<PostStatisticsResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.user;

      const stats = await this.postService.getAllPostStatistics(id);
      const totalPostCount = await this.postService.getTotalPostCounts(id);

      const response = new PostStatisticsResponseDto(
        true,
        '전체 post 통계 조회에 성공하였습니다.',
        { totalPostCount, stats },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('전체 통계 조회 실패:', error);
      next(error);
    }
  };

  getPostByPostId: RequestHandler<PostParam> = async (
    req: Request<PostParam, object, object, GetPostQuery>,
    res: Response<PostResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const postId = Number(req.params.postId);
      const { start, end } = req.query;

      const post = await this.postService.getPostByPostId(postId, start, end);

      const response = new PostResponseDto(true, '단건 post 조회에 성공하였습니다.', { post }, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('단건 조회 실패 : ', error);
      next(error);
    }
  };

  getPostByUUID: RequestHandler<PostParam> = async (
    req: Request<PostParam>,
    res: Response<PostResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const postId = req.params.postId;

      const post = await this.postService.getPostByPostUUID(postId);

      const response = new PostResponseDto(true, 'uuid로 post 조회에 성공하였습니다.', { post }, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('단건 조회 실패 : ', error);
      next(error);
    }
  };
}
