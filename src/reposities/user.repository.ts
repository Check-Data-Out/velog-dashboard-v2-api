import { Pool } from 'pg';
import logger from 'src/configs/logger.config';
import { User } from 'src/types';

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserEmail(email: string) {
    try {
      const user = await this.pool.query('SELECT * FROM "users" WHERE email = $1', [email]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('이메일로 사용자 조회 중 오류:', error);
      throw new Error('이메일로 사용자를 조회하지 못했습니다');
    }
  }
  async findByUserVelogUUID(uuid: string) {
    try {
      const user = await this.pool.query('SELECT * FROM "users" WHERE velog_uuid = $1', [uuid]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('Velog UUID로 유저를 조회 중 오류', error);
      throw new Error(`UUID: ${uuid}로 사용자 조회 중 문제가 발생했습니다.`);
    }
  }
  async updateTokens(uuid: string, encryptedAccessToken: string, encryptedRefreshToken: string): Promise<User> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        UPDATE users
        SET access_token = $1, refresh_token = $2
        WHERE velog_uuid = $3
        RETURNING *;
      `;
      const values = [encryptedAccessToken, encryptedRefreshToken, uuid];

      const result = await client.query(query, values);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('토큰을 업데이트하는 중 오류가 발생하였습니다.', error);
      throw error;
    } finally {
      client.release();
    }
  }
  async createUser(
    uuid: string,
    email: string,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
  ): Promise<User> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
      INSERT INTO users (velog_uuid, access_token, refresh_token, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `;
      const values = [uuid, encryptedAccessToken, encryptedRefreshToken, email];

      const result = await client.query(query, values);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('유저를 생성하는 중 오류가 발생하였습니다.', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
