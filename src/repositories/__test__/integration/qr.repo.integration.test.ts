import dotenv from 'dotenv';
import pg, { Pool, PoolClient } from 'pg';
import { UserRepository } from '@/repositories/user.repository';
import { generateRandomToken } from '@/utils/generateRandomToken.util';
import { insertQRLoginToken, insertUser } from './fixtures';

dotenv.config();
jest.setTimeout(5000);

/**
 * 어느 DB 에 붙든 데이터가 남지 않도록 테스트마다 트랜잭션 안에서 시드하고 되돌린다.
 */
describe('UserRepository QR 토큰 통합 테스트', () => {
  let testPool: Pool;
  let client: PoolClient;
  let repo: UserRepository;
  let userId: number;

  const ip = '127.0.0.1';
  const userAgent = 'test-agent';

  beforeAll(() => {
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
  });

  beforeEach(async () => {
    client = await testPool.connect();
    await client.query('BEGIN');
    repo = new UserRepository(client as unknown as Pool);
    userId = await insertUser(client);
  });

  afterEach(async () => {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await testPool.end();
  });

  const findRow = async (token: string) =>
    (await client.query('SELECT * FROM users_qrlogintoken WHERE token = $1', [token])).rows[0];

  describe('QR 토큰 생성', () => {
    it('QR 토큰을 5분 유효한 미사용 상태로 생성해야 한다', async () => {
      const token = generateRandomToken();

      await repo.createQRLoginToken(token, userId, ip, userAgent);

      const row = await findRow(token);
      expect(Number(row.user_id)).toBe(userId);
      expect(row.is_used).toBe(false);
      expect(row.ip_address).toBe(ip);
      expect(row.user_agent).toBe(userAgent);
      expect(new Date(row.expires_at).getTime() - new Date(row.created_at).getTime()).toBe(5 * 60 * 1000);
    });
  });

  describe('QR 토큰 로그아웃 무효화', () => {
    it('그 사용자의 토큰을 모두 사용 처리하고 사용 시각은 남기지 않아야 한다', async () => {
      const token = generateRandomToken();
      const otherToken = generateRandomToken();
      await repo.createQRLoginToken(token, userId, ip, userAgent);
      await repo.createQRLoginToken(otherToken, userId, ip, userAgent);

      await repo.updateQRLoginTokenToUse(userId);

      for (const t of [token, otherToken]) {
        const row = await findRow(t);
        expect(row.is_used).toBe(true);
        expect(row.used_at).toBeNull();
      }
    });
  });

  describe('QR 토큰 확인 소비', () => {
    const usedIp = '10.0.0.1';
    const usedUserAgent = 'phone-agent';

    it('유효한 토큰을 소비하면 user_id 를 돌려주고 사용 시각·IP·User-Agent 를 남겨야 한다', async () => {
      const token = generateRandomToken();
      await repo.createQRLoginToken(token, userId, ip, userAgent);

      const consumedUserId = await repo.consumeQRLoginToken(token, usedIp, usedUserAgent);

      expect(consumedUserId).toBe(userId);
      const row = await findRow(token);
      expect(row.is_used).toBe(true);
      expect(row.used_at).not.toBeNull();
      expect(row.used_ip).toBe(usedIp);
      expect(row.used_user_agent).toBe(usedUserAgent);
    });

    it('이미 소비한 토큰을 다시 소비하면 null 이어야 한다', async () => {
      const token = generateRandomToken();
      await repo.createQRLoginToken(token, userId, ip, userAgent);
      await repo.consumeQRLoginToken(token, usedIp, usedUserAgent);

      expect(await repo.consumeQRLoginToken(token, usedIp, usedUserAgent)).toBeNull();
    });

    it('같은 사용자의 다른 토큰은 쓰지 않은 상태로 남아야 한다', async () => {
      const token = generateRandomToken();
      const otherToken = generateRandomToken();
      await repo.createQRLoginToken(token, userId, ip, userAgent);
      await repo.createQRLoginToken(otherToken, userId, ip, userAgent);

      await repo.consumeQRLoginToken(token, usedIp, usedUserAgent);

      expect((await findRow(otherToken)).is_used).toBe(false);
    });

    it('만료된 토큰은 소비되지 않고 null 이어야 한다', async () => {
      const token = generateRandomToken();
      await insertQRLoginToken(client, userId, token, -5, false);

      expect(await repo.consumeQRLoginToken(token, usedIp, usedUserAgent)).toBeNull();
      expect((await findRow(token)).used_at).toBeNull();
    });

    it('255자를 넘는 User-Agent 도 자르지 않고 그대로 남겨야 한다', async () => {
      const token = generateRandomToken();
      const longUserAgent = 'a'.repeat(300);
      await repo.createQRLoginToken(token, userId, ip, userAgent);

      expect(await repo.consumeQRLoginToken(token, usedIp, longUserAgent)).toBe(userId);
      expect((await findRow(token)).used_user_agent).toBe(longUserAgent);
    });
  });

  describe('QR 토큰 상태 조회', () => {
    it('쓰지 않았고 만료되지 않은 본인 토큰은 pending 이어야 한다', async () => {
      const token = generateRandomToken();
      await repo.createQRLoginToken(token, userId, ip, userAgent);

      expect(await repo.findQRLoginTokenStatus(token, userId)).toEqual({ status: 'pending' });
    });

    it('확인으로 소비된 본인 토큰은 used 와 사용 기기 정보를 돌려줘야 한다', async () => {
      const token = generateRandomToken();
      await repo.createQRLoginToken(token, userId, ip, userAgent);
      await repo.consumeQRLoginToken(token, '10.0.0.1', 'phone-agent');

      const result = await repo.findQRLoginTokenStatus(token, userId);

      expect(result).toEqual({
        status: 'used',
        usedAt: expect.any(String),
        userAgent: 'phone-agent',
        ip: '10.0.0.1',
      });
      expect(new Date((result as { usedAt: string }).usedAt).toISOString()).toBe((result as { usedAt: string }).usedAt);
    });

    it('만료된 본인 토큰은 expired 여야 한다', async () => {
      const token = generateRandomToken();
      await insertQRLoginToken(client, userId, token, -5, false);

      expect(await repo.findQRLoginTokenStatus(token, userId)).toEqual({ status: 'expired' });
    });

    it('로그아웃으로 무효화된 본인 토큰은 expired 여야 한다', async () => {
      const token = generateRandomToken();
      await repo.createQRLoginToken(token, userId, ip, userAgent);
      await repo.updateQRLoginTokenToUse(userId);

      expect(await repo.findQRLoginTokenStatus(token, userId)).toEqual({ status: 'expired' });
    });

    it('다른 사용자의 토큰은 사용됐더라도 expired 여야 한다', async () => {
      const token = generateRandomToken();
      const otherUserId = await insertUser(client, 'integration-test-other');
      await repo.createQRLoginToken(token, otherUserId, ip, userAgent);
      await repo.consumeQRLoginToken(token, '10.0.0.1', 'phone-agent');

      expect(await repo.findQRLoginTokenStatus(token, userId)).toEqual({ status: 'expired' });
    });

    it('없는 토큰은 expired 여야 한다', async () => {
      expect(await repo.findQRLoginTokenStatus(generateRandomToken(), userId)).toEqual({ status: 'expired' });
    });
  });
});
