import { TrackingRepository } from '../repositories/tracking.repository';

export class TrackingService {
  constructor(private trackingRepo: TrackingRepository) {}

  async tracking(type: string, id: number) {
    return await this.trackingRepo.save(type, id);
  }
}
