/**
 * 주의: 이 통합 테스트는 현재 시간에 의존적입니다.
 * getCurrentKSTDateString과 getKSTDateStringWithOffset 함수는 실제 시간을 기준으로
 * 날짜 문자열을 생성하므로, 테스트 실행 시간에 따라 결과가 달라질 수 있습니다.
 */

import dotenv from 'dotenv';
import pg, { Pool, PoolClient } from 'pg';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { PostLeaderboardSortType, UserLeaderboardSortType } from '@/types';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';
import { insertDailyStats, insertPost, insertUser } from './fixtures';

dotenv.config();
jest.setTimeout(60000); // 각 케이스당 60초 타임아웃 설정

const DAY = 24 * 60;

/**
 * LeaderboardRepository 통합 테스트
 *
 * 어느 DB 에 붙든 데이터가 남지 않도록 테스트마다 트랜잭션 안에서 시드하고 되돌린다.
 * 리더보드는 전체 사용자·게시물을 정렬해 LIMIT 하므로, 실데이터가 있는 DB 에서도 시드가 상위에 오도록
 * 증가량을 integer 한도(2^31-1) 안에서 압도적으로 크게 잡고 "시드 id 가 결과에 있고 값이 일치"로 단언한다.
 *
 * 시드 (사용자마다 게시물 1개, 기준일 통계 view·like 100):
 *   - viewTop:   30일 전 기준, 오늘 조회수 +1.9e9, 좋아요 +1e6
 *   - likeTop:   30일 전 기준, 오늘 조회수 +1e6, 좋아요 +1.9e9
 *   - yesterday: 30일 전 기준, 오늘 통계 없음, 어제 조회수 +1.7e9
 *   - range3:    3일 전 기준만 있음(30일 기준 수집 누락), 오늘 조회수·좋아요 +1.8e9, 1년 전 발행
 *   - noName:    username NULL, 30일 전 기준, 오늘 조회수 +1.5e9
 *   - newPost:   위 게시물(30일 전 기준, 오늘 +1) 에 더해 2일 전 발행 게시물 1개(기준 통계 없음, 오늘 조회수·좋아요 1.6e9)
 *                → 유일하게 post_diff 1, 새 게시물은 released_at 조건으로만 게시물 리더보드에 들어간다
 */
describe('LeaderboardRepository 통합 테스트', () => {
  let testPool: Pool;
  let client: PoolClient;
  let repo: LeaderboardRepository;
  let seed: Record<'viewTop' | 'likeTop' | 'yesterday' | 'range3' | 'noName', { userId: number; postId: number }>;
  let newPost: { userId: number; postId: number };

  const DEFAULT_PARAMS = {
    USER_SORT: 'viewCount' as UserLeaderboardSortType,
    POST_SORT: 'viewCount' as PostLeaderboardSortType,
    DATE_RANGE: 30,
    LIMIT: 10,
  };

  const BASE = 100;
  const NEW_POST_STAT = 1_600_000_000;

  const seedUserWithPost = async (
    username: string | null,
    startDate: string,
    latest: { date: string; view: number; like: number },
  ) => {
    const userId = await insertUser(client, username);
    const { id: postId } = await insertPost(
      client,
      userId,
      getKSTDateStringWithOffset(-365 * DAY),
      username ?? 'no-name',
    );
    await insertDailyStats(client, postId, startDate, BASE, BASE);
    await insertDailyStats(client, postId, latest.date, BASE + latest.view, BASE + latest.like);
    return { userId, postId };
  };

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
      statement_timeout: 30000, // 쿼리 타임아웃 증가 (30초)
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
    repo = new LeaderboardRepository(client as unknown as Pool);

    const today = getCurrentKSTDateString();
    const yesterday = getKSTDateStringWithOffset(-DAY);
    const past30 = getKSTDateStringWithOffset(-30 * DAY);
    const past3 = getKSTDateStringWithOffset(-3 * DAY);

    seed = {
      viewTop: await seedUserWithPost('it-view-top', past30, { date: today, view: 1_900_000_000, like: 1_000_000 }),
      likeTop: await seedUserWithPost('it-like-top', past30, { date: today, view: 1_000_000, like: 1_900_000_000 }),
      yesterday: await seedUserWithPost('it-yesterday', past30, { date: yesterday, view: 1_700_000_000, like: 0 }),
      range3: await seedUserWithPost('it-range3', past3, { date: today, view: 1_800_000_000, like: 1_800_000_000 }),
      noName: await seedUserWithPost(null, past30, { date: today, view: 1_500_000_000, like: 0 }),
    };

    // HAVING 조건(기준 통계 합 != 0)을 통과하려면 기준 통계가 있는 게시물이 하나 있어야 한다
    const { userId: newPostUserId } = await seedUserWithPost('it-new-post', past30, { date: today, view: 1, like: 1 });
    const { id: newPostId } = await insertPost(
      client,
      newPostUserId,
      getKSTDateStringWithOffset(-2 * DAY),
      'it-new-post',
    );
    await insertDailyStats(client, newPostId, today, NEW_POST_STAT, NEW_POST_STAT);
    newPost = { userId: newPostUserId, postId: newPostId };
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

  const ids = (rows: { id: number | string }[]): number[] => rows.map((row) => Number(row.id));

  describe('getUserLeaderboard', () => {
    it('사용자 통계 배열로 이루어진 리더보드를 반환해야 한다', async () => {
      const result = await repo.getUserLeaderboard(
        DEFAULT_PARAMS.USER_SORT,
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      const viewTop = result.find((user) => Number(user.id) === seed.viewTop.userId);
      expect(viewTop).toBeDefined();
      expect(viewTop.email).toBeNull();
      expect(viewTop.username).toBe('it-view-top');
      expect(Number(viewTop.total_views)).toBe(BASE + 1_900_000_000);
      expect(Number(viewTop.total_likes)).toBe(BASE + 1_000_000);
      expect(Number(viewTop.total_posts)).toBe(1);
      expect(Number(viewTop.view_diff)).toBe(1_900_000_000);
      expect(Number(viewTop.like_diff)).toBe(1_000_000);
      expect(Number(viewTop.post_diff)).toBe(0);
    });

    describe.each([
      { sort: 'viewCount', field: 'view_diff' },
      { sort: 'likeCount', field: 'like_diff' },
    ])('sort 파라미터에 따라 내림차순 정렬되어야 한다', ({ sort, field }) => {
      it(`sort가 ${sort}인 경우 ${field} 필드를 기준으로 정렬해야 한다`, async () => {
        const result = await repo.getUserLeaderboard(
          sort as UserLeaderboardSortType,
          DEFAULT_PARAMS.DATE_RANGE,
          DEFAULT_PARAMS.LIMIT,
        );

        expect(result.length).toBeGreaterThanOrEqual(2);
        const isSorted = result.every((leaderboardUser, idx) => {
          if (idx === 0) return true;
          return Number(leaderboardUser[field]) <= Number(result[idx - 1][field]);
        });

        expect(isSorted).toBe(true);
      });
    });

    it('다양한 정렬 기준으로 결과를 반환해야 한다', async () => {
      const resultByViewDiff = await repo.getUserLeaderboard(
        'viewCount',
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );
      const resultByLikeDiff = await repo.getUserLeaderboard(
        'likeCount',
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      expect(Number(resultByViewDiff[0].id)).toBe(seed.viewTop.userId);
      expect(Number(resultByLikeDiff[0].id)).toBe(seed.likeTop.userId);
    });

    it('sort가 postCount인 경우 기간 내 발행 게시물이 있는 사용자가 1위여야 한다', async () => {
      const result = await repo.getUserLeaderboard('postCount', DEFAULT_PARAMS.DATE_RANGE, DEFAULT_PARAMS.LIMIT);

      expect(Number(result[0].id)).toBe(newPost.userId);
      expect(Number(result[0].post_diff)).toBe(1);
      expect(Number(result[0].total_posts)).toBe(2);
      // 기준 통계가 없는 새 게시물은 오늘 값 전체가 증가량이 된다
      expect(Number(result[0].view_diff)).toBe(1 + NEW_POST_STAT);
      expect(Number(result[0].like_diff)).toBe(1 + NEW_POST_STAT);
    });

    it('limit 파라미터가 결과 개수를 제한해야 한다', async () => {
      const limit1Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 1);
      const limit2Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 2);

      expect(limit1Result.length).toBe(1);
      expect(limit2Result.length).toBe(2);
    });

    it('dateRange 파라미터를 통한 날짜 범위가 적용되어야 한다', async () => {
      const range3Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, 3, DEFAULT_PARAMS.LIMIT);
      const range30Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, 30, DEFAULT_PARAMS.LIMIT);

      // 기준일 통계가 있는 사용자만 해당 범위에 집계된다
      expect(ids(range3Result)).toContain(seed.range3.userId);
      expect(ids(range3Result)).not.toContain(seed.viewTop.userId);
      expect(ids(range30Result)).toContain(seed.viewTop.userId);
      expect(ids(range30Result)).not.toContain(seed.range3.userId);
    });

    it('username이 null인 사용자는 제외되어야 한다', async () => {
      const result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);

      expect(ids(result)).not.toContain(seed.noName.userId);
      result.forEach((user) => {
        expect(user.username).not.toBeNull();
      });
    });

    it('데이터 수집이 비정상적인 유저는 리더보드에 포함되지 않아야 한다', async () => {
      const result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);

      // range3 사용자는 30일 전 기준 통계가 없어(수집 누락) 제외된다
      expect(ids(result)).not.toContain(seed.range3.userId);
    });
  });

  describe('getPostLeaderboard', () => {
    it('게시물 통계 배열로 이루어진 리더보드를 반환해야 한다', async () => {
      const result = await repo.getPostLeaderboard(
        DEFAULT_PARAMS.POST_SORT,
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      const viewTop = result.find((post) => Number(post.id) === seed.viewTop.postId);
      expect(viewTop).toBeDefined();
      expect(viewTop.title).toBe('it-view-top');
      expect(viewTop.slug).toEqual(expect.stringContaining('integration-test-'));
      expect(viewTop.username).toBe('it-view-top');
      expect(Number(viewTop.total_views)).toBe(BASE + 1_900_000_000);
      expect(Number(viewTop.total_likes)).toBe(BASE + 1_000_000);
      expect(Number(viewTop.view_diff)).toBe(1_900_000_000);
      expect(Number(viewTop.like_diff)).toBe(1_000_000);
      expect(viewTop.released_at).toBeInstanceOf(Date);
    });

    describe.each([
      { sort: 'viewCount', field: 'view_diff' },
      { sort: 'likeCount', field: 'like_diff' },
    ])('sort 파라미터에 따라 내림차순 정렬되어야 한다', ({ sort, field }) => {
      it(`sort가 ${sort}인 경우 ${field} 필드를 기준으로 정렬해야 한다`, async () => {
        const result = await repo.getPostLeaderboard(
          sort as PostLeaderboardSortType,
          DEFAULT_PARAMS.DATE_RANGE,
          DEFAULT_PARAMS.LIMIT,
        );

        expect(result.length).toBeGreaterThanOrEqual(2);
        const isSorted = result.every((leaderboardPost, idx) => {
          if (idx === 0) return true;
          return Number(leaderboardPost[field]) <= Number(result[idx - 1][field]);
        });

        expect(isSorted).toBe(true);
      });
    });

    it('다양한 정렬 기준으로 결과를 반환해야 한다', async () => {
      const resultByViewDiff = await repo.getPostLeaderboard(
        'viewCount',
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );
      const resultByLikeDiff = await repo.getPostLeaderboard(
        'likeCount',
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      expect(Number(resultByViewDiff[0].id)).toBe(seed.viewTop.postId);
      expect(Number(resultByLikeDiff[0].id)).toBe(seed.likeTop.postId);
    });

    it('limit 파라미터가 결과 개수를 제한해야 한다', async () => {
      const limit1Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 1);
      const limit2Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 2);

      expect(limit1Result.length).toBe(1);
      expect(limit2Result.length).toBe(2);
    });

    it('dateRange 파라미터를 통한 날짜 범위가 적용되어야 한다', async () => {
      const range3Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, 3, DEFAULT_PARAMS.LIMIT);
      const range30Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, 30, DEFAULT_PARAMS.LIMIT);

      // 기준일 통계가 있는 게시물만 해당 범위에 포함된다 (모두 1년 전 발행)
      expect(ids(range3Result)).toContain(seed.range3.postId);
      expect(ids(range3Result)).not.toContain(seed.viewTop.postId);
      expect(ids(range30Result)).toContain(seed.viewTop.postId);
      expect(ids(range30Result)).not.toContain(seed.range3.postId);
    });

    it('데이터 수집이 비정상적인 게시물은 리더보드에 포함되지 않아야 한다', async () => {
      const result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);

      // range3 게시물은 기간 전에 발행됐는데 30일 전 기준 통계가 없어(수집 누락) 제외된다
      expect(ids(result)).not.toContain(seed.range3.postId);
    });

    it('기간 내 발행된 게시물은 기준 통계가 없어도 포함되고 오늘 값 전체가 증가량이어야 한다', async () => {
      const result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);
      const target = result.find((post) => Number(post.id) === newPost.postId);

      expect(target).toBeDefined();
      expect(Number(target.total_views)).toBe(NEW_POST_STAT);
      expect(Number(target.total_likes)).toBe(NEW_POST_STAT);
      expect(Number(target.view_diff)).toBe(NEW_POST_STAT);
      expect(Number(target.like_diff)).toBe(NEW_POST_STAT);
    });

    it('오늘 통계가 없는 게시물은 어제 값을 오늘 값으로 사용해야 한다', async () => {
      // 집계 배치가 하루 종일 도는 구조라 오늘 row 가 아직 없는 게시물이 항상 존재한다.
      // 시각 기반 분기를 없앤 today_stats 가 이런 게시물을 0 이 아니라 어제 값으로 집계하는지 확인한다.
      const result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);
      const target = result.find((post) => Number(post.id) === seed.yesterday.postId);

      expect(Number(target?.total_views)).toBe(BASE + 1_700_000_000);
    });
  });
});
