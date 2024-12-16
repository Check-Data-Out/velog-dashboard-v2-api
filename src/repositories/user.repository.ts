import { Pool } from 'pg';
import logger from '../configs/logger.config';
import { User } from '../types';
import { DBError } from '../exception';

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserVelogUUID(uuid: string): Promise<User> {
    try {
      const user = await this.pool.query('SELECT * FROM "users_user" WHERE velog_uuid = $1', [uuid]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('Velog UUID로 유저를 조회 중 오류', error);
      throw new DBError('유저 조회 중 문제가 발생했습니다.');
    }
  }
  async updateTokens(uuid: string, encryptedAccessToken: string, encryptedRefreshToken: string): Promise<User> {
    try {
      const query = `
        UPDATE "users_user"
        SET access_token = $1, refresh_token = $2, updated_at = NOW(), is_active = true
        WHERE velog_uuid = $3
        RETURNING *;
      `;
      const values = [encryptedAccessToken, encryptedRefreshToken, uuid];

      const result = await this.pool.query(query, values);

      if (!result.rows[0]) {
        throw new DBError('해당 UUID를 가진 유저를 찾을 수 없습니다.');
      }
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
    groupId: number,
  ): Promise<User> {
    try {
      const query = `
      INSERT INTO "users_user" (
      velog_uuid,
      access_token,
      refresh_token,
      email,
      group_id,
      is_active,
      created_at,
      updated_at
      )
      VALUES (
      $1, $2, $3, $4, $5, true, NOW(), NOW()
      )
      RETURNING *;
      `;
      const values = [uuid, encryptedAccessToken, encryptedRefreshToken, email, groupId];

      const result = await this.pool.query(query, values);
      if (!result.rows[0]) {
        throw new DBError('유저 생성에 실패했습니다.');
      }
      return result.rows[0];
    } catch (error) {
      logger.error('유저를 생성하는 중 오류', error);
      throw new DBError('유저 생성 중 문제가 발생했습니다.');
    }
  }
}
