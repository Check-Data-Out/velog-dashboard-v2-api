import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '@/configs/logger.config';
import { TrackingService } from '@/services/tracking.service';
import { EmptyResponseDto } from '@/types';

export class TrackingController {
  constructor(private trackingService: TrackingService) { }

  event: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>, next: NextFunction) => {
    try {
      const { eventType } = req.body;
      const { id } = req.user;

      await this.trackingService.tracking(eventType, id, req.headers);

      const response = new EmptyResponseDto(true, '이벤트 데이터 저장완료', {}, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('user tracking 실패 : ', error);
      next(error);
    }
  };

  stay: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>, next: NextFunction) => {
    try {
      const { loadDate, unloadDate } = req.body;
      const { id } = req.user;

      await this.trackingService.stay({ loadDate, unloadDate }, id);

      const response = new EmptyResponseDto(true, '체류시간 데이터 저장 완료', {}, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error('user stay time 저장 실패 : ', error);
      next(error);
    }
  };
}
