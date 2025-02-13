import { EventRequestDto, StayTimeRequestDto } from '@/types';
import { TrackingRepository } from '@/repositories/tracking.repository';
import logger from '@/configs/logger.config';
import { BadRequestError } from '@/exception';

export class TrackingService {
  constructor(private trackingRepo: TrackingRepository) {}

  async tracking(eventType: EventRequestDto, id: number, req_headers: object) {
    return await this.trackingRepo.createEvent(eventType, id, req_headers);
  }

  async stay(data: StayTimeRequestDto, userId: number) {
    try {
      const { loadDate, unloadDate } = data;
      if (new Date(loadDate) > new Date(unloadDate)) {
        throw new BadRequestError('시간 정보가 올바르지 않습니다.');
      }

      const stayTime = new Date(unloadDate).getTime() - new Date(loadDate).getTime();
      await this.trackingRepo.createStayTime(loadDate, unloadDate, userId);

      return stayTime;
    } catch (error) {
      logger.error('Tracking Service stay error : ', error);
      throw error;
    }
  }
}
