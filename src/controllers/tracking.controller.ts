import { NextFunction, Request, RequestHandler, Response } from 'express';
import logger from '../configs/logger.config';
import { TrackingService } from '../services/tracking.service';
import { TrackingResponse } from '../types';

export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  event = (async (req: Request, res: Response<TrackingResponse>, next: NextFunction) => {
    try {
      const { eventType } = req.body;
      const { id } = req.user;

      await this.trackingService.tracking(eventType, id);
      return res.status(200).json({ success: true, message: '이벤트 데이터 저장완료', data: {}, error: null });
    } catch (error) {
      logger.error('user tracking 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;

  stay = (async (req: Request, res: Response<TrackingResponse>, next: NextFunction) => {
    try {
      const { loadDate, unloadDate } = req.body;
      const { id } = req.user;

      await this.trackingService.stay({ loadDate, unloadDate }, id);
      return res.status(200).json({ success: true, message: '체류시간 데이터 저장 완료', data: {}, error: null });
    } catch (error) {
      logger.error('user stay time 저장 실패 : ', error);
      next(error);
    }
  }) as RequestHandler;
}
