import dotenv from 'dotenv';
import pg, { Pool, PoolClient } from 'pg';
import { PostRepository } from '@/repositories/post.repository';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';
import { insertDailyStats, insertPost, insertUser } from './fixtures';

dotenv.config();
jest.setTimeout(30000);

const DAY = 24 * 60;

/**
 * PostRepository 통합 테스트
 *
 * 어느 DB 에 붙든 데이터가 남지 않도록 테스트마다 트랜잭션 안에서 시드하고 되돌린다.
 * 시드: 사용자 1명, 게시물 3개(오늘·어제 통계), 정렬 기준마다 순서가 다르도록 값을 잡는다.
 *   - released_at 내림차순: p3 > p2 > p1
 *   - 오늘 조회수 내림차순: p1(30) > p3(20) > p2(10)
 *   - 오늘 좋아요 내림차순: p2(5) > p3(3) > p1(1)
 *   - 조회수 성장 내림차순: p1(+20) > p2(+5) > p3(0)
 */
describe('PostRepository 통합 테스트', () => {
  let testPool: Pool;
  let client: PoolClient;
  let repo: PostRepository;
  let userId: number;
  let p1: { id: number; postUuid: string };
  let p2: { id: number; postUuid: string };
  let p3: { id: number; postUuid: string };

  const todayKST = (): string => getCurrentKSTDateString();
  const yesterdayKST = (): string => getKSTDateStringWithOffset(-DAY);
  const tenDaysAgoKST = (): string => getKSTDateStringWithOffset(-10 * DAY);
  const ids = (posts: { id: number | string }[]): number[] => posts.map((post) => Number(post.id));

  beforeAll(() => {
    const testPoolConfig: pg.PoolConfig = {
      database: process.env.DATABASE_NAME,
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      password: process.env.POSTGRES_PASSWORD,
      port: Number(process.env.POSTGRES_PORT),
      max: 1, // 최대 연결 수
      idleTimeoutMillis: 30000, // 연결 유휴 시간 (30초)
      connectionTimeoutMillis: 5000, // 연결 시간 초과 (5초)
      allowExitOnIdle: false, // 유휴 상태에서 종료 허용
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
    repo = new PostRepository(client as unknown as Pool);

    userId = await insertUser(client);
    p1 = await insertPost(client, userId, getKSTDateStringWithOffset(-3 * DAY));
    p2 = await insertPost(client, userId, getKSTDateStringWithOffset(-2 * DAY));
    p3 = await insertPost(client, userId, getKSTDateStringWithOffset(-1 * DAY));

    await insertDailyStats(client, p1.id, tenDaysAgoKST(), 1, 0);
    await insertDailyStats(client, p1.id, yesterdayKST(), 10, 1);
    await insertDailyStats(client, p1.id, todayKST(), 30, 1);
    await insertDailyStats(client, p2.id, yesterdayKST(), 5, 2);
    await insertDailyStats(client, p2.id, todayKST(), 10, 5);
    await insertDailyStats(client, p3.id, yesterdayKST(), 20, 3);
    await insertDailyStats(client, p3.id, todayKST(), 20, 3);
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

  /**
   * findPostsByUserId 테스트
   */
  describe('findPostsByUserId', () => {
    it('사용자 ID로 게시물 목록을 조회할 수 있어야 한다', async () => {
      const result = await repo.findPostsByUserId(userId);

      expect(ids(result.posts)).toEqual([p3.id, p2.id, p1.id]);
      expect(result.nextCursor).toBeTruthy();
      expect(result.posts[2]).toMatchObject({
        daily_view_count: 30,
        daily_like_count: 1,
        yesterday_daily_view_count: 10,
        yesterday_daily_like_count: 1,
      });
    });

    it('페이지네이션을 위한 nextCursor를 제공해야 한다', async () => {
      const limitedResult = await repo.findPostsByUserId(userId, undefined, undefined, false, 1);

      expect(ids(limitedResult.posts)).toEqual([p3.id]);
      expect(limitedResult.nextCursor).toBeTruthy();

      const secondPage = await repo.findPostsByUserId(userId, limitedResult.nextCursor || undefined);

      expect(ids(secondPage.posts)).toEqual([p2.id, p1.id]);
    });

    it('정렬 옵션을 적용할 수 있어야 한다', async () => {
      const result = await repo.findPostsByUserId(userId, undefined, 'dailyViewCount', false);

      expect(ids(result.posts)).toEqual([p1.id, p3.id, p2.id]);
    });

    it('오름차순 정렬이 제대로 동작해야 한다', async () => {
      const result = await repo.findPostsByUserId(userId, undefined, undefined, true);

      expect(ids(result.posts)).toEqual([p1.id, p2.id, p3.id]);
    });

    it('다양한 정렬 기준으로 결과를 반환해야 한다', async () => {
      const resultByLikes = await repo.findPostsByUserId(userId, undefined, 'dailyLikeCount', false);
      const resultByDate = await repo.findPostsByUserId(userId);

      expect(ids(resultByLikes.posts)).toEqual([p2.id, p3.id, p1.id]);
      expect(ids(resultByDate.posts)).toEqual([p3.id, p2.id, p1.id]);
    });

    it('limit 매개변수가 결과 개수를 제한해야 한다', async () => {
      const result1 = await repo.findPostsByUserId(userId, undefined, undefined, false, 1);
      const result2 = await repo.findPostsByUserId(userId, undefined, undefined, false, 2);

      expect(result1.posts.length).toBe(1);
      expect(result2.posts.length).toBe(2);
    });

    it('cursor를 사용한 페이지네이션이 일관성 있게 동작해야 한다', async () => {
      const page1 = await repo.findPostsByUserId(userId, undefined, undefined, false, 2);
      const page2 = await repo.findPostsByUserId(userId, page1.nextCursor || undefined, undefined, false, 2);

      // 첫 페이지와 두 번째 페이지의 항목은 중복되지 않고 이어져야 함
      expect(ids(page1.posts)).toEqual([p3.id, p2.id]);
      expect(ids(page2.posts)).toEqual([p1.id]);
    });
  });

  /**
   * findPostsByUserIdWithGrowthMetrics 테스트
   */
  describe('findPostsByUserIdWithGrowthMetrics', () => {
    it('트래픽 성장률 데이터를 포함한 게시물 목록을 조회할 수 있어야 한다', async () => {
      const result = await repo.findPostsByUserIdWithGrowthMetrics(userId);

      expect(result.nextCursor).toBeTruthy();
      expect(result.posts[0]).toMatchObject({ view_growth: 20, like_growth: 0 });
    });

    it('트래픽 성장률을 기준으로 내림차순 정렬해야 한다', async () => {
      const result = await repo.findPostsByUserIdWithGrowthMetrics(userId);

      expect(ids(result.posts)).toEqual([p1.id, p2.id, p3.id]);
      expect(result.posts.map((post) => post.view_growth)).toEqual([20, 5, 0]);
    });

    it('오름차순 정렬이 제대로 동작해야 한다', async () => {
      const result = await repo.findPostsByUserIdWithGrowthMetrics(userId, undefined, true);

      expect(ids(result.posts)).toEqual([p3.id, p2.id, p1.id]);
    });

    it('페이지네이션을 위한 nextCursor를 제공해야 한다', async () => {
      const limitedResult = await repo.findPostsByUserIdWithGrowthMetrics(userId, undefined, false, 1);

      expect(ids(limitedResult.posts)).toEqual([p1.id]);
      expect(limitedResult.nextCursor).toBeTruthy();

      const secondPage = await repo.findPostsByUserIdWithGrowthMetrics(userId, limitedResult.nextCursor || undefined);

      // 첫 페이지와 두 번째 페이지의 항목은 중복되지 않아야 함
      expect(ids(secondPage.posts)).toEqual([p2.id, p3.id]);
    });
  });

  /**
   * getTotalPostCounts 테스트
   */
  describe('getTotalPostCounts', () => {
    it('사용자의 총 게시물 수를 반환해야 한다', async () => {
      const count = await repo.getTotalPostCounts(userId);

      expect(count).toBe(3);
    });
  });

  /**
   * getYesterdayAndTodayViewLikeStats 테스트
   */
  describe('getYesterdayAndTodayViewLikeStats', () => {
    it('어제와 오늘의 통계 데이터를 반환해야 한다', async () => {
      const stats = await repo.getYesterdayAndTodayViewLikeStats(userId);

      expect(Number(stats.daily_view_count)).toBe(60);
      expect(Number(stats.daily_like_count)).toBe(9);
      expect(Number(stats.yesterday_views)).toBe(35);
      expect(Number(stats.yesterday_likes)).toBe(6);
      expect(stats.last_updated_date).not.toBeNull();
    });

    it('존재하지 않는 사용자 ID에 대해 기본값을 반환해야 한다', async () => {
      const nonExistentUserId = -1; // identity 컬럼이라 음수 ID 는 존재할 수 없다
      const stats = await repo.getYesterdayAndTodayViewLikeStats(nonExistentUserId);

      expect(stats).toBeDefined();
      expect(Number(stats.daily_view_count)).toBe(0);
      expect(Number(stats.daily_like_count)).toBe(0);
      expect(Number(stats.yesterday_views)).toBe(0);
      expect(Number(stats.yesterday_likes)).toBe(0);
    });
  });

  /**
   * findPostByPostId 테스트
   */
  describe('findPostByPostId', () => {
    it('게시물 ID로 통계 데이터를 조회할 수 있어야 한다', async () => {
      const result = await repo.findPostByPostId(p1.id, getKSTDateStringWithOffset(-7 * DAY), todayKST());

      expect(result.map(({ daily_view_count, daily_like_count }) => ({ daily_view_count, daily_like_count }))).toEqual([
        { daily_view_count: 10, daily_like_count: 1 },
        { daily_view_count: 30, daily_like_count: 1 },
      ]);
    });

    it('날짜 범위를 지정하여 조회할 수 있어야 한다', async () => {
      const result = await repo.findPostByPostId(p1.id, tenDaysAgoKST(), yesterdayKST());

      // 범위 양 끝(포함)만 조회되고 범위 밖 오늘 통계는 빠진다
      expect(result.map((entry) => new Date(entry.date).getTime())).toEqual([
        new Date(tenDaysAgoKST()).getTime(),
        new Date(yesterdayKST()).getTime(),
      ]);
    });

    it('날짜 오름차순으로 정렬된 결과를 반환해야 한다', async () => {
      const result = await repo.findPostByPostId(p1.id, tenDaysAgoKST(), todayKST());

      expect(result.map((entry) => new Date(entry.date).getTime())).toEqual([
        new Date(tenDaysAgoKST()).getTime(),
        new Date(yesterdayKST()).getTime(),
        new Date(todayKST()).getTime(),
      ]);
    });

    it('존재하지 않는 게시물 ID에 대해 빈 배열을 반환해야 한다', async () => {
      const nonExistentPostId = -1; // identity 컬럼이라 음수 ID 는 존재할 수 없다
      const result = await repo.findPostByPostId(nonExistentPostId, getKSTDateStringWithOffset(-7 * DAY), todayKST());

      expect(result).toEqual([]);
    });

    it('날짜 형식이 올바르게 변환되어야 한다', async () => {
      const result = await repo.findPostByPostId(p1.id, yesterdayKST(), yesterdayKST());

      expect(result).toHaveLength(1);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(new Date(result[0].date).getTime()).toBe(new Date(yesterdayKST()).getTime());
    });

    it('일일 조회수와 좋아요 수가 숫자 타입이어야 한다', async () => {
      const result = await repo.findPostByPostId(p1.id, getKSTDateStringWithOffset(-7 * DAY), todayKST());

      expect(result).toHaveLength(2);
      result.forEach((item) => {
        expect(typeof item.daily_view_count).toBe('number');
        expect(typeof item.daily_like_count).toBe('number');
      });
    });
  });

  /**
   * findPostByPostUUID 테스트
   */
  describe('findPostByPostUUID', () => {
    it('게시물 UUID로 통계 데이터를 조회할 수 있어야 한다', async () => {
      const result = await repo.findPostByPostUUID(p2.postUuid, getKSTDateStringWithOffset(-7 * DAY), todayKST());

      expect(result.map(({ daily_view_count, daily_like_count }) => ({ daily_view_count, daily_like_count }))).toEqual([
        { daily_view_count: 5, daily_like_count: 2 },
        { daily_view_count: 10, daily_like_count: 5 },
      ]);
    });
  });
});
