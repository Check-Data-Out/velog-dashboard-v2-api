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

  describe('QR 토큰 생성 및 조회', () => {
    it('QR 토큰을 생성하고 정상 조회할 수 있어야 한다', async () => {
      const token = generateRandomToken();

      await repo.createQRLoginToken(token, userId, ip, userAgent);
      const foundToken = await repo.findQRLoginToken(token);

      // 토큰이 존재함을 확인하고 타입 단언
      expect(foundToken).not.toBeNull();
      const nonNullToken = foundToken as NonNullable<typeof foundToken>;

      expect(nonNullToken.token).toBe(token);
      expect(Number(nonNullToken.user_id)).toBe(userId);
      expect(nonNullToken.is_used).toBe(false);
      expect(nonNullToken.ip_address).toBe(ip);
      expect(nonNullToken.user_agent).toBe(userAgent);
      expect(new Date(nonNullToken.expires_at).getTime()).toBeGreaterThan(new Date(nonNullToken.created_at).getTime());
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
      await repo.createQRLoginToken(token, userId, ip, userAgent);
      expect(await repo.findQRLoginToken(token)).not.toBeNull();

      await repo.updateQRLoginTokenToUse(userId);

      // 토큰이 is_used=true로 변경되었으므로 findQRLoginToken에서 null 반환 예상
      const afterUpdate = await repo.findQRLoginToken(token);
      expect(afterUpdate).toBeNull();
    });
  });

  describe('QR 토큰 만료 처리', () => {
    it('만료된 토큰은 조회되지 않아야 한다', async () => {
      const token = generateRandomToken();
      await insertQRLoginToken(client, userId, token, -5, false);

      const found = await repo.findQRLoginToken(token);

      expect(found).toBeNull();
    });

    it('만료되고 사용된 토큰도 조회되지 않아야 한다', async () => {
      const token = generateRandomToken();
      await insertQRLoginToken(client, userId, token, -5, true);

      const found = await repo.findQRLoginToken(token);

      expect(found).toBeNull();
    });
  });
});
