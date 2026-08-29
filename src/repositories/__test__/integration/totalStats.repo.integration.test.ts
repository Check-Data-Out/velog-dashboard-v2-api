import dotenv from 'dotenv';
import pg, { Pool } from 'pg';
import logger from '@/configs/logger.config';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';

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
  let repo: TotalStatsRepository;

  const TEST_DATA = {
    USER_ID: 1,
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

  beforeAll(async () => {
    try {
      const testPoolConfig: pg.PoolConfig = {
        database: process.env.DATABASE_NAME,
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST,
        password: process.env.POSTGRES_PASSWORD,
        port: Number(process.env.POSTGRES_PORT),
        max: 1, // SET TIME ZONE 이 이후 모든 쿼리에 유지되도록 단일 커넥션 사용
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

      await testPool.query('SELECT 1');
      logger.info('TotalStatsRepository 통합 테스트 DB 연결 성공');

      // production 과 동일한 UTC 세션을 재현한다.
      // pooler 가 startup parameter 를 무시하므로 연결 옵션이 아니라 쿼리로 설정한다.
      await testPool.query("SET TIME ZONE 'UTC'");

      repo = new TotalStatsRepository(testPool);
    } catch (error) {
      logger.error('TotalStatsRepository 통합 테스트 설정 중 오류 발생:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      if (testPool) {
        await testPool.end();
      }
      logger.info('TotalStatsRepository 통합 테스트 DB 연결 종료');
    } catch (error) {
      logger.error('TotalStatsRepository 통합 테스트 종료 중 오류:', error);
    }
  });

  describe('getTotalStats - post 타입', () => {
    it('세션 타임존이 UTC 여도 날짜 축의 시작과 끝이 KST 기준이어야 한다', async () => {
      const result = await repo.getTotalStats(TEST_DATA.USER_ID, TEST_DATA.PERIOD, 'post');

      const dates = result.map((row) => toDateString(row.date));
      const expectedStart = toKSTDatePart(getKSTDateStringWithOffset(-TEST_DATA.PERIOD * 24 * 60));
      const expectedEnd = toKSTDatePart(getCurrentKSTDateString());

      expect(dates[0]).toBe(expectedStart);
      expect(dates[dates.length - 1]).toBe(expectedEnd);
    });

    it('날짜 축이 하루 간격으로 빠짐없이 이어져야 한다', async () => {
      const result = await repo.getTotalStats(TEST_DATA.USER_ID, TEST_DATA.PERIOD, 'post');

      const dates = result.map((row) => toDateString(row.date));
      const uniqueSorted = [...new Set(dates)].sort();

      expect(dates).toEqual(uniqueSorted);
      expect(dates).toHaveLength(TEST_DATA.PERIOD + 1);
    });
  });
});
