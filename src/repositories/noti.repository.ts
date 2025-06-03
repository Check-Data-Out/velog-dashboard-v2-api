import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError } from '@/exception';

export class NotiRepository {
  constructor(private pool: Pool) {}

  async getAllNotiPosts(limit: number = 5) {
    try {
      const query = `
        SELECT
          n.id,
          n.title,
          n.content,
          n.created_at
        FROM noti_notipost n
        WHERE n.is_active = true
        ORDER BY n.id DESC
        LIMIT ${limit};
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Noti Repo getAllNotiPosts Error : ', error);
      throw new DBError('알림 조회 중 문제가 발생했습니다.');
    }
  }
}
