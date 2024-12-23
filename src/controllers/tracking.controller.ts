import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '../configs/logger.config';
import { TrackingService } from '../services/tracking.service';

export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  event = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const { id } = req.user;

      await this.trackingService.tracking(type, id);
      return res.status(200).json({ success: true, message: '이벤트 데이터 저장완료' });
    } catch (error) {
      logger.error('user tracking 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;

  stay = (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { loadDate, unloadDate } = req.body;
      const { id } = req.user;

      await this.trackingService.stay({ loadDate, unloadDate }, id);
      return res.status(200).json({ success: true, message: '체류시간 데이터 완료' });
    } catch (error) {
      logger.error('user stay time 저장 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;
}
