import { Pool } from 'pg';
import logger from 'src/configs/logger.config';

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserEmail(email: string) {
    try {
      const user = await this.pool.query('SELECT * FROM "users" WHERE email = $1', [email]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('Error in findByUserEmail:', error);
      throw error;
    }
  }
  async findByUserVelogUUID(uuid: string) {
    const user = await this.pool.query('SELECT * FROM "users" WHERE velog_uuid = $1', [uuid]);
    return user.rows[0] || null;
  }
  async updateTokens(uuid: string, encryptedAccessToken: string, encryptedRefreshToken: string) {
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

      const result = await this.pool.query(query, values);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in updateTokens', error);
    } finally {
      client.release();
    }
  }
  async createUser(uuid: string, email: string, encryptedAccessToken: string, encryptedRefreshToken: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
      INSERT INTO users (velog_uuid, access_token, refresh_token, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `;
      const values = [uuid, encryptedAccessToken, encryptedRefreshToken, email];

      const result = await this.pool.query(query, values);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in createUser', error);
    } finally {
      client.release();
    }
  }
}
