import dotenv from 'dotenv';
import { Pool } from 'pg';
import pg from 'pg';
import { DBError } from '@/exception';
import { QRLoginTokenRepository } from '@/repositories/qr.repository';
import { generateRandomToken } from '@/utils/generateRandomToken.util';
import logger from '@/configs/logger.config';

dotenv.config();
jest.setTimeout(30000);

describe('QRLoginTokenRepository 통합 테스트', () => {
  let testPool: Pool;
  let repo: QRLoginTokenRepository;

  const TEST_DATA = {
    USER_ID: 1,
  };

  beforeAll(async () => {
    const testPoolConfig: pg.PoolConfig = {
      database: process.env.DATABASE_NAME,
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      password: process.env.POSTGRES_PASSWORD,
      port: Number(process.env.POSTGRES_PORT),
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: false,
      statement_timeout: 30000,
    };

    if (process.env.POSTGRES_HOST !== 'localhost') {
      testPoolConfig.ssl = { rejectUnauthorized: false };
    }

    testPool = new Pool(testPoolConfig);

    await testPool.query('SELECT 1');
    logger.info('테스트 DB 연결 성공');

    repo = new QRLoginTokenRepository(testPool);
  });

  afterAll(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (testPool) {
        await testPool.end();
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info('테스트 DB 연결 종료');
    } catch (error) {
      logger.error('테스트 종료 중 오류:', error);
    }
  });

  describe('QR 토큰 생성 및 조회', () => {
    it('QR 토큰을 생성하고 정상 조회할 수 있어야 한다', async () => {
      const token = generateRandomToken();
      const ip = '127.0.0.1';
      const userAgent = 'test-agent';

      await repo.createQRLoginToken(token, TEST_DATA.USER_ID, ip, userAgent);
      const foundToken = await repo.findQRLoginToken(token);

      expect(foundToken).not.toBeNull();
      expect(foundToken?.token).toBe(token);
      expect(foundToken?.is_used).toBe(false);
      expect(new Date(foundToken!.expires_at).getTime()).toBeGreaterThan(new Date(foundToken!.created_at).getTime());
    });

    it('존재하지 않는 토큰 조회 시 null을 반환해야 한다', async () => {
      const invalidToken = generateRandomToken();
      const result = await repo.findQRLoginToken(invalidToken);

      expect(result).toBeNull();
    });
  });

  describe('QR 토큰 사용 처리', () => {
    it('QR 토큰을 사용 처리한 후 조회되지 않아야 한다', async () => {
      const token = generateRandomToken();
      const ip = '127.0.0.1';
      const userAgent = 'test-agent';

      await repo.createQRLoginToken(token, TEST_DATA.USER_ID, ip, userAgent);
      await repo.markTokenUsed(token);

      const found = await repo.findQRLoginToken(token);

      expect(found).toBeNull();
    });
  });

  describe('QR 토큰 만료 처리', () => {
    it('만료된 토큰은 조회되지 않아야 한다', async () => {
      const token = generateRandomToken();
      const ip = '127.0.0.1';
      const userAgent = 'test-agent';

      await testPool.query(
        `
          INSERT INTO users_qrlogintoken (token, user_id, created_at, expires_at, is_used, ip_address, user_agent)
          VALUES ($1, $2, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes', false, $3, $4)
        `,
        [token, TEST_DATA.USER_ID, ip, userAgent]
      );

      const found = await repo.findQRLoginToken(token);

      expect(found).toBeNull();
    });

    it('만료되고 사용된 토큰도 조회되지 않아야 한다', async () => {
      const token = generateRandomToken();
      const ip = '127.0.0.1';
      const userAgent = 'test-agent';

      await testPool.query(
        `
          INSERT INTO users_qrlogintoken (token, user_id, created_at, expires_at, is_used, ip_address, user_agent)
          VALUES ($1, $2, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes', true, $3, $4)
        `,
        [token, TEST_DATA.USER_ID, ip, userAgent]
      );

      const found = await repo.findQRLoginToken(token);

      expect(found).toBeNull();
    });
  });

  describe('예외 상황', () => {
    it('중복 토큰 삽입 시 DBError를 발생시켜야 한다', async () => {
      const token = generateRandomToken();
      const ip = '127.0.0.1';
      const userAgent = 'test-agent';
  
      await repo.createQRLoginToken(token, TEST_DATA.USER_ID, ip, userAgent);
  
      await expect(
        repo.createQRLoginToken(token, TEST_DATA.USER_ID, ip, userAgent)
      ).rejects.toThrow(DBError);
      
      await testPool.end();
      logger.info('중복 토큰 테스트 후 DB 연결 종료');
    });
  });
});
