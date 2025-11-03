import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { User } from '@/types';
import { QRLoginToken } from '@/types/models/QRLoginToken.type';
import { DBError } from '@/exception';

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(id: number): Promise<User | null> {
    try {
      const user = await this.pool.query('SELECT * FROM "users_user" WHERE id = $1', [id]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('Id로 유저를 조회 중 오류 : ', error);
      throw new DBError('유저 조회 중 문제가 발생했습니다.');
    }
  }

  async findByUserVelogUUID(uuid: string): Promise<User | null> {
    try {
      const user = await this.pool.query('SELECT * FROM "users_user" WHERE velog_uuid = $1', [uuid]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('Velog UUID로 유저를 조회 중 오류 : ', error);
      throw new DBError('유저 조회 중 문제가 발생했습니다.');
    }
  }

  async findByUserEmail(email: string): Promise<User | null> {
    try {
      const user = await this.pool.query('SELECT * FROM "users_user" WHERE email = $1', [email]);
      return user.rows[0] || null;
    } catch (error) {
      logger.error('Email로 유저를 조회 중 오류 : ', error);
      throw new DBError('유저 조회 중 문제가 발생했습니다.');
    }
  }

  async findSampleUser(): Promise<User> {
    try {
      const query = `
        SELECT * FROM "users_user"
        WHERE velog_uuid = '8f561807-8304-4006-84a5-ee3fa8b46d23';
      `;

      const result = await this.pool.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('User Repo findSampleUser Error : ', error);
      throw new DBError('샘플 유저 조회 중 문제가 발생했습니다.');
    }
  }

  async updateTokens(
    uuid: string,
    email: string | null,
    username: string | null,
    thumbnail: string | null,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
  ): Promise<User> {
    try {
      const query = `
        UPDATE "users_user"
        SET access_token = $1, refresh_token = $2, email = $3, username = $4, thumbnail = $5, updated_at = NOW(), is_active = true
        WHERE velog_uuid = $6
        RETURNING *;
      `;
      const values = [encryptedAccessToken, encryptedRefreshToken, email, username, thumbnail, uuid];

      const result = await this.pool.query(query, values);

      if (!result.rows[0]) {
        throw new DBError('해당 UUID를 가진 유저를 찾을 수 없습니다.');
      }
      return result.rows[0];
    } catch (error) {
      logger.error('User Repo updateTokens error : ', error);
      throw new DBError('토큰 업데이트 중 문제가 발생했습니다.');
    }
  }

  async createUser(
    uuid: string,
    email: string | null,
    username: string | null,
    thumbnail: string | null,
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
        username,
        thumbnail,
        group_id,
        is_active,
        newsletter_subscribed,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, true, NOW(), NOW()
      )
      RETURNING *;
      `;
      const values = [uuid, encryptedAccessToken, encryptedRefreshToken, email, username, thumbnail, groupId];

      const result = await this.pool.query(query, values);
      if (!result.rows[0]) {
        throw new DBError('유저 생성에 실패했습니다.');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('User Repo createUser Error : ', error);
      throw new DBError('유저 생성 중 문제가 발생했습니다.');
    }
  }

  async createQRLoginToken(token: string, userId: number, ip: string, userAgent: string): Promise<void> {
    try {
      const query = `
            INSERT INTO users_qrlogintoken (token, user_id, created_at, expires_at, is_used, ip_address, user_agent)
            VALUES ($1, $2, NOW(), NOW() + INTERVAL '5 minutes', false, $3, $4);
        `;
      await this.pool.query(query, [token, userId, ip, userAgent]);
    } catch (error) {
      logger.error('QRLoginToken Repo Create Error : ', error);
      throw new DBError('QR 코드 토큰 생성 중 문제가 발생했습니다.');
    }
  }

  async findQRLoginToken(token: string): Promise<QRLoginToken | null> {
    try {
      const query = `
            SELECT *
            FROM users_qrlogintoken
            WHERE token = $1 AND is_used = false AND expires_at > NOW();
        `;
      const result = await this.pool.query(query, [token]);
      return result.rows[0] ?? null;
    } catch (error) {
      logger.error('QRLoginToken Repo find QR Code Error : ', error);
      throw new DBError('QR 코드 토큰 조회 중 문제가 발생했습니다.');
    }
  }

  async updateQRLoginTokenToUse(user_id: number): Promise<void> {
    try {
      const query = `
        UPDATE users_qrlogintoken SET is_used = true WHERE user_id = $1;
      `;
      await this.pool.query(query, [user_id]);
    } catch (error) {
      logger.error('QRLoginToken Repo mark as used Error : ', error);
      throw new DBError('QR 코드 사용 처리 중 문제가 발생했습니다.');
    }
  }

  async unsubscribeNewsletter(id: number): Promise<void> {
    try {
      const query = `UPDATE "users_user" SET newsletter_subscribed = false WHERE id = $1`;
      await this.pool.query(query, [id]);
    } catch (error) {
      logger.error('User Repo unsubscribeNewsletter Error : ', error);
      throw new DBError('뉴스레터 구독 해제 중 문제가 발생했습니다.');
    }
  }
}
