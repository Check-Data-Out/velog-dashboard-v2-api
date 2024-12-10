import { Pool } from 'pg';
import logger from '../configs/logger.config';
import { User } from '../types';
import { DBError } from '../exception/db.exception';

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserVelogUUID(uuid: string) {
    try {
      const user = await this.pool.query('SELECT * FROM "users" WHERE velog_uuid = $1', [uuid]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('Velog UUID로 유저를 조회 중 오류', error);
      throw new DBError('유저 조회 중 문제가 발생했습니다.');
    }
  }
  async updateTokens(uuid: string, encryptedAccessToken: string, encryptedRefreshToken: string): Promise<User> {
    try {
      const query = `
        UPDATE users
        SET access_token = $1, refresh_token = $2
        WHERE velog_uuid = $3
        RETURNING *;
      `;
      const values = [encryptedAccessToken, encryptedRefreshToken, uuid];

      const result = await this.pool.query(query, values);

      return result.rows[0];
    } catch (error) {
      logger.error('토큰을 업데이트하는 중 오류', error);
      throw new DBError('토큰 업데이트 중 문제가 발생했습니다.');
    }
  }

  async createUser(
    uuid: string,
    email: string,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
  ): Promise<User> {
    try {
      const query = `
      INSERT INTO users (velog_uuid, access_token, refresh_token, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `;
      const values = [uuid, encryptedAccessToken, encryptedRefreshToken, email];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('유저를 생성하는 중 오류', error);
      throw new DBError('유저 생성 중 문제가 발생했습니다.');
    }
  }
}
