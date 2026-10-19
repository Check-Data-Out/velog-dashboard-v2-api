import dotenv from 'dotenv';
import pg, { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { UserRepository } from '@/repositories/user.repository';

dotenv.config();
jest.setTimeout(10000);

/**
 * 어느 DB 에 붙든 데이터가 남지 않도록 테스트마다 트랜잭션 안에서 실행하고 되돌린다.
 * 저장소에 트랜잭션을 연결한 클라이언트를 Pool 대신 넘기므로, 저장소 메서드가 pool.connect() 를 쓰게 되면 이 방식을 다시 봐야 한다.
 */
describe('UserRepository 세션 버전 통합 테스트', () => {
  let testPool: Pool;
  let client: PoolClient;
  let repo: UserRepository;

  beforeAll(() => {
    const testPoolConfig: pg.PoolConfig = {
      database: process.env.DATABASE_NAME,
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      password: process.env.POSTGRES_PASSWORD,
      port: Number(process.env.POSTGRES_PORT),
      max: 1,
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

  // 컬럼을 나열하는 신규 가입 INSERT 로 만든다 (session_version 은 DB 기본값)
  const createTestUser = async () =>
    repo.createUser(randomUUID(), null, 'integration-test', null, 'enc-access', 'enc-refresh', 1);

  it('신규 가입 사용자의 세션 버전은 DB 기본값 0 이다', async () => {
    const user = await createTestUser();

    expect(user.session_version).toBe(0);
  });

  it('세션 버전 증가는 DB 값을 1 올린다', async () => {
    const user = await createTestUser();

    await repo.incrementSessionVersion(user.id);

    expect((await repo.findByUserId(user.id))?.session_version).toBe(1);
  });
});
