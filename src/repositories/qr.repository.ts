import { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { DBError } from '@/exception';
import { QRLoginToken } from '@/types/models/QRLoginToken.type';

export class QRLoginTokenRepository {
    constructor(private pool: Pool) { }

    async createQRLoginToken(token: string, userId: number, ip: string, userAgent: string): Promise<void> {
        try {
            const query = `
                INSERT INTO qr_login_tokens (token, user_id, created_at, expires_at, is_used, ip_address, user_agent)
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
                FROM qr_login_tokens
                WHERE token = $1 AND is_used = false AND expires_at > NOW();
            `;
            const result = await this.pool.query(query, [token]);
            return result.rows[0] ?? null;
        } catch (error) {
            logger.error('QRLoginToken Repo find QR Code Error : ', error);
            throw new DBError('QR 코드 토큰 조회 중 문제가 발생했습니다.');
        }
    }

    async markTokenUsed(token: string): Promise<void> {
        try {
          const query = `
            UPDATE qr_login_tokens SET is_used = true WHERE token = $1;
          `;
          await this.pool.query(query, [token]);
        } catch (error) {
          logger.error('QRLoginToken Repo mark as used Error : ', error);
          throw new DBError('QR 코드 사용 처리 중 문제가 발생했습니다.');
        }
      }
}