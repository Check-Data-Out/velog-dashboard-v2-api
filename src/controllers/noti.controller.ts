import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { NotiService } from '@/services/noti.service';
import { NotiPostsResponseDto } from '@/types/dto/responses/notiResponse.type';

export class NotiController {
  constructor(private notiService: NotiService) {}

  getAllNotiPosts: RequestHandler = async (req: Request, res: Response<NotiPostsResponseDto>, next: NextFunction) => {
    try {
      const result = await this.notiService.getAllNotiPosts();
      const response = new NotiPostsResponseDto(true, '전체 noti post 조회에 성공하였습니다.', { posts: result }, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error('전체 조회 실패:', error);
      next(error);
    }
  };
}
