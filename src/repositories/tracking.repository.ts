import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError } from '@/exception';
import { EventRequestDto } from '@/types';

export class TrackingRepository {
  constructor(private readonly pool: Pool) {}

  async createEvent(type: EventRequestDto, id: number) {
    try {
      const result = await this.pool.query(
        `
        INSERT INTO tracking_usereventtracking (event_type, user_id, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        RETURNING *;
      `,
        [type, id],
      );
      return result.rows[0];
    } catch (error) {
      logger.error('User Tracking 정보 저장 중 오류 : ', error);
      throw new DBError('User Tracking 정보 저장 중 문제가 발생하였습니다.');
    }
  }

  async createStayTime(loadDate: Date, unloadDate: Date, userId: number) {
    try {
      await this.pool.query(
        `
        INSERT INTO tracking_userstaytime (loaded_at, unloaded_at, user_id)
        VALUES ($1, $2, $3)
        RETURNING *;
        `,
        [loadDate, unloadDate, userId],
      );
    } catch (error) {
      logger.error('User Stay Time 정보 저장 중 오류 : ', error);
      throw new DBError('User의 체류시간 정보 저장 중 문제가 발생하였습니다.');
    }
  }
}
