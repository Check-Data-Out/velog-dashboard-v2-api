import dotenv from 'dotenv';
import { Pool } from 'pg';
import pg from 'pg';
import { QRLoginTokenRepository } from '@/repositories/qr.repository';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
jest.setTimeout(30000);

describe('QRLoginTokenRepository Integration Test', () => {
  let pool: Pool;
  let repo: QRLoginTokenRepository;

  beforeAll(async () => {
    try {
      const testPoolConfig: pg.PoolConfig = {
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST,
        database: process.env.DATABASE_NAME,
        password: process.env.POSTGRES_PASSWORD,
        port: Number(process.env.POSTGRES_PORT),
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 30000,
      };
  
      if (process.env.POSTGRES_HOST !== 'localhost') {
        testPoolConfig.ssl = { 
            rejectUnauthorized: false,
        };
      }
  
      pool = new Pool(testPoolConfig);
      await pool.query('SELECT 1'); // 연결 확인
      console.info('QR 테스트 DB 연결 성공');
  
      // 필요한 테이블 및 유저 존재 확인 (선택 사항)
      const tableCheck = await pool.query(`SELECT to_regclass('qr_login_tokens')`);
      if (!tableCheck.rows[0].to_regclass) {
        throw new Error('qr_login_tokens 테이블이 존재하지 않습니다.');
      }
  
      const userCheck = await pool.query(`SELECT COUNT(*) FROM users WHERE id = $1`, [1]);
      if (parseInt(userCheck.rows[0].count) === 0) {
        throw new Error('user_id = 1 유저가 존재하지 않습니다.');
      }
  
      repo = new QRLoginTokenRepository(pool);
    } catch (error) {
      console.error('QR 테스트 설정 중 오류:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should insert and retrieve QR token', async () => {
    const token = uuidv4();
    const userId = 1;
    const ip = '127.0.0.1';
    const userAgent = 'test-agent';

    await repo.createQRLoginToken(token, userId, ip, userAgent);
    const result = await repo.findQRLoginToken(token);

    expect(result).not.toBeNull();
    expect(result?.token).toBe(token);
  });

  it('should return null for expired or used token', async () => {
    const result = await repo.findQRLoginToken('invalid-token');
    expect(result).toBeNull();
  });
});