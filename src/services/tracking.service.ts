import { EventRequestDto, StayTimeRequestDto } from '../types';
import { TrackingRepository } from '../repositories/tracking.repository';
import logger from '../configs/logger.config';
import { BadRequestError } from '../exception';

export class TrackingService {
  constructor(private trackingRepo: TrackingRepository) {}

  async tracking(type: EventRequestDto, id: number) {
    return await this.trackingRepo.saveEvent(type, id);
  }
  async stay(data: StayTimeRequestDto, userId: number) {
    try {
      const { loadDate, unloadDate } = data;
      if (new Date(loadDate) > new Date(unloadDate)) {
        throw new BadRequestError('시간 정보가 올바르지 않습니다.');
      }
      const stayTime = new Date(unloadDate).getTime() - new Date(loadDate).getTime();
      await this.trackingRepo.saveStayTime(loadDate, unloadDate, userId);
      return stayTime;
    } catch (error) {
      logger.error('체류 시간 처리 중 오류 발생 : ', error);
      throw error;
    }
  }
}
