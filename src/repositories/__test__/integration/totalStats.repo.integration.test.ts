import dotenv from 'dotenv';
import pg, { Pool, PoolClient } from 'pg';
import logger from '@/configs/logger.config';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';
import { insertPost, insertUser } from './fixtures';

dotenv.config();
jest.setTimeout(30000);

/**
 * TotalStatsRepository 통합 테스트
 *
 * 이 테스트 파일은 실제 데이터베이스와 연결하여 날짜 축이 KST 기준으로 만들어지는지 검증합니다.
 * production 의 PG 서버 타임존이 UTC 이므로(back-office/init.sql), 세션 타임존을 UTC 로 맞춰
 * 동일한 조건에서 확인합니다.
 */
describe('TotalStatsRepository 통합 테스트', () => {
  let testPool: Pool;
  let client: PoolClient;
  let repo: TotalStatsRepository;

  const TEST_DATA = {
    PERIOD: 7 as const,
  };

  /** 'YYYY-MM-DD 00:00:00+09' 에서 날짜 부분만 추출 */
  const toKSTDatePart = (kstString: string): string => kstString.slice(0, 10);

  /**
   * pg 는 date 타입을 로컬 자정 Date 로 파싱하므로 로컬 게터로 읽어야 러너 타임존과 무관해진다.
   * toISOString() 을 쓰면 UTC 로 변환되어 날짜가 밀린다.
   */
  const toDateString = (value: unknown): string => {
    const date = value instanceof Date ? value : new Date(String(value));
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

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

    // localhost 가 아니면 ssl 필수
    if (process.env.POSTGRES_HOST != 'localhost') {
      testPoolConfig.ssl = {
        rejectUnauthorized: false,
      };
    }

    testPool = new Pool(testPoolConfig);
  });

  beforeEach(async () => {
    client = await testPool.connect();
    await client.query('BEGIN');
    // production 과 동일한 UTC 세션을 재현한다.
    // pooler 가 startup parameter 를 무시하므로 연결 옵션이 아니라 쿼리로 설정하고, 트랜잭션이 끝나면 되돌아간다.
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    repo = new TotalStatsRepository(client as unknown as Pool);
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

  describe('getTotalStats - post 타입', () => {
    it('세션 타임존이 UTC 여도 날짜 축이 KST 기준 오늘 포함 N일이어야 한다', async () => {
      // 기대값은 쿼리 전에 잡는다. 쿼리 도중 KST 자정을 넘기면 결과와 기대값의 기준일이 갈라진다.
      const expectedStart = toKSTDatePart(getKSTDateStringWithOffset(-(TEST_DATA.PERIOD - 1) * 24 * 60));
      const expectedEnd = toKSTDatePart(getCurrentKSTDateString());
      // KST 기준 2일 전 자정에 발행된 게시글 1개 → 마지막 3일만 누적 1
      const userId = await insertUser(client);
      await insertPost(client, userId, getKSTDateStringWithOffset(-2 * 24 * 60));

      const result = await repo.getTotalStats(userId, TEST_DATA.PERIOD, 'post');
      const dates = result.map((row) => toDateString(row.date));

      // 쿼리 전후로 날짜가 바뀌었다면 이 실행은 판정 불가이므로 건너뛴다 (자정 직후 1회성)
      if (toKSTDatePart(getCurrentKSTDateString()) !== expectedEnd) {
        logger.info('테스트 도중 KST 날짜가 바뀌어 날짜 축 검증을 건너뜁니다.');
        return;
      }

      expect(dates[0]).toBe(expectedStart);
      expect(dates[dates.length - 1]).toBe(expectedEnd);
      expect(dates).toHaveLength(TEST_DATA.PERIOD);
      expect(result.map((row) => Number(row.total_value))).toEqual([0, 0, 0, 0, 1, 1, 1]);
    });
  });
});
