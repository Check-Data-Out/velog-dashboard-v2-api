import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { User } from '@/types';
import { QRLoginTokenStatus } from '@/types/models/QRLoginToken.type';
import { DBError } from '@/exception';

// 로그인 없이 둘러보기용 샘플 계정
export const SAMPLE_USER_VELOG_UUID = '8f561807-8304-4006-84a5-ee3fa8b46d23';

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
        WHERE velog_uuid = $1;
      `;

      const result = await this.pool.query(query, [SAMPLE_USER_VELOG_UUID]);
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

  /**
   * 쓰지 않았고 만료되지 않은 토큰을 한 문장으로 사용 처리하고 토큰 주인의 user_id 를 돌려줍니다.
   * 이미 쓰였거나 만료됐거나 없는 토큰이면 null 입니다.
   */
  async consumeQRLoginToken(token: string, ip: string, userAgent: string): Promise<number | null> {
    try {
      const query = `
        UPDATE users_qrlogintoken
        SET is_used = true, used_at = NOW(), used_ip = $2, used_user_agent = $3
        WHERE token = $1 AND is_used = false AND expires_at > NOW()
        RETURNING user_id;
      `;
      const result = await this.pool.query(query, [token, ip, userAgent]);
      return result.rows[0] ? Number(result.rows[0].user_id) : null;
    } catch (error) {
      logger.error('QRLoginToken Repo consume Error : ', error);
      throw new DBError('QR 코드 사용 처리 중 문제가 발생했습니다.');
    }
  }

  /**
   * 본인 토큰의 상태를 돌려줍니다. 다른 사용자의 토큰이나 없는 토큰도 존재를 숨기려고 expired 로 답한다.
   * 로그아웃으로 무효화된 토큰(is_used=true, used_at 없음)도 expired 다.
   */
  async findQRLoginTokenStatus(token: string, userId: number): Promise<QRLoginTokenStatus> {
    try {
      const query = `
        SELECT is_used, used_at, used_ip, used_user_agent, expires_at > NOW() AS is_alive
        FROM users_qrlogintoken
        WHERE token = $1 AND user_id = $2;
      `;
      const row = (await this.pool.query(query, [token, userId])).rows[0];

      if (row?.used_at) {
        return {
          status: 'used',
          usedAt: new Date(row.used_at).toISOString(),
          userAgent: row.used_user_agent,
          ip: row.used_ip,
        };
      }
      if (row && !row.is_used && row.is_alive) {
        return { status: 'pending' };
      }
      return { status: 'expired' };
    } catch (error) {
      logger.error('QRLoginToken Repo find status Error : ', error);
      throw new DBError('QR 코드 상태 조회 중 문제가 발생했습니다.');
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

  /**
   * 세션 버전을 1 올려 그 사용자의 모든 기기 세션을 무효화합니다.
   */
  async incrementSessionVersion(id: number): Promise<void> {
    try {
      const query = `UPDATE "users_user" SET session_version = session_version + 1 WHERE id = $1`;
      await this.pool.query(query, [id]);
    } catch (error) {
      logger.error('User Repo incrementSessionVersion Error : ', error);
      throw new DBError('로그아웃 처리 중 문제가 발생했습니다.');
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
