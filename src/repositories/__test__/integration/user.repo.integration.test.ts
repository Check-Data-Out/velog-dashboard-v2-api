import dotenv from 'dotenv';
import pg, { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { UserRepository } from '@/repositories/user.repository';
import { User } from '@/types';

dotenv.config();
jest.setTimeout(10000);

describe('UserRepository 세션 버전 통합 테스트', () => {
  let testPool: Pool;
  let repo: UserRepository;
  let user: User;

  beforeAll(async () => {
    const testPoolConfig: pg.PoolConfig = {
      database: process.env.DATABASE_NAME,
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      password: process.env.POSTGRES_PASSWORD,
      port: Number(process.env.POSTGRES_PORT),
      max: 2,
    };
    if (process.env.POSTGRES_HOST !== 'localhost') {
      testPoolConfig.ssl = { rejectUnauthorized: false };
    }

    testPool = new Pool(testPoolConfig);
    repo = new UserRepository(testPool);
    // 컬럼을 나열하는 신규 가입 INSERT 로 만든다 (session_version 은 DB 기본값)
    user = await repo.createUser(randomUUID(), null, 'integration-test', null, 'enc-access', 'enc-refresh', 1);
  });

  afterAll(async () => {
    await testPool.query('DELETE FROM "users_user" WHERE id = $1', [user.id]);
    await testPool.end();
  });

  const currentVersion = async () =>
    (await testPool.query('SELECT session_version FROM "users_user" WHERE id = $1', [user.id])).rows[0].session_version;

  it('신규 가입 사용자의 세션 버전은 DB 기본값 0 이다', async () => {
    expect(user.session_version).toBe(0);
  });

  it('세션 버전 증가는 DB 값을 1 올린다', async () => {
    const before = await currentVersion();

    await repo.incrementSessionVersion(user.id);

    expect(await currentVersion()).toBe(before + 1);
  });

  it('동시에 두 번 올리면 2 가 오른다', async () => {
    const before = await currentVersion();

    await Promise.all([repo.incrementSessionVersion(user.id), repo.incrementSessionVersion(user.id)]);

    expect(await currentVersion()).toBe(before + 2);
  });
});
