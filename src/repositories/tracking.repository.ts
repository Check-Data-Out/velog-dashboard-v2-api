import { Pool } from 'pg';
import logger from 'src/configs/logger.config';
import { DBError } from 'src/exception/db.exception';

export class TrackingRepository {
  constructor(private readonly pool: Pool) {}

  async save(type: string, id: number) {
    try {
      const result = await this.pool.query(
        `
        INSERT INTO user_event_tracking (type, user_id)
        VALUES ($1, $2)
        RETURNING *;
        `,
        [type, id],
      );
      return result.rows[0];
    } catch (error) {
      logger.error('User Tracking 정보 저장 중 오류', error);
      throw new DBError('User Tracking 정보 저장 중 문제가 발생하였습니다.');
    }
  }
}
