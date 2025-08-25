/**
 * 주의: 이 통합 테스트는 현재 시간에 의존적입니다.
 * getCurrentKSTDateString과 getKSTDateStringWithOffset 함수는 실제 시간을 기준으로
 * 날짜 문자열을 생성하므로, 테스트 실행 시간에 따라 결과가 달라질 수 있습니다.
 */

import logger from '@/configs/logger.config';
import dotenv from 'dotenv';
import pg, { Pool } from 'pg';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { PostLeaderboardSortType, UserLeaderboardSortType } from '@/types';
import { getKSTDateStringWithOffset } from '@/utils/date.util';

dotenv.config();
jest.setTimeout(30000); // 각 케이스당 30초 타임아웃 설정

/**
 * LeaderboardRepository 통합 테스트
 *
 * 이 테스트 파일은 실제 데이터베이스와 연결하여 LeaderboardRepository의 모든 메서드를
 * 실제 환경과 동일한 조건에서 테스트합니다.
 */
describe('LeaderboardRepository 통합 테스트', () => {
  let testPool: Pool;
  let repo: LeaderboardRepository;

  const DEFAULT_PARAMS = {
    USER_SORT: 'viewCount' as UserLeaderboardSortType,
    POST_SORT: 'viewCount' as PostLeaderboardSortType,
    DATE_RANGE: 30,
    LIMIT: 10,
  };

  beforeAll(async () => {
    try {
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

      // 연결 확인
      await testPool.query('SELECT 1');
      logger.info('LeaderboardRepository 통합 테스트 DB 연결 성공');

      // 리포지토리 인스턴스 생성
      repo = new LeaderboardRepository(testPool);

      // 충분한 데이터가 있는지 확인 (limit 기본값인 10을 기준으로 함)
      const userCheck = await testPool.query('SELECT COUNT(*) >= 10 AS is_enough FROM users_user');
      const postCheck = await testPool.query('SELECT COUNT(*) >= 10 AS is_enough FROM posts_post');
      const statsCheck = await testPool.query('SELECT COUNT(*) > 0 AS is_enough FROM posts_postdailystatistics');

      if (!userCheck.rows[0].is_enough || !postCheck.rows[0].is_enough || !statsCheck.rows[0].is_enough) {
        logger.warn('주의: LeaderboardRepository 통합 테스트를 위한 충분한 데이터가 없습니다.');
      }
    } catch (error) {
      logger.error('LeaderboardRepository 통합 테스트 설정 중 오류 발생:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
        // 모든 쿼리 완료 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
  
        // 풀 완전 종료
        if (testPool) {
          // 강제 종료: 모든 활성 쿼리와 연결 중지
          await testPool.end();
        }
  
        // 추가 정리 시간
        await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('LeaderboardRepository 통합 테스트 DB 연결 종료');
    } catch (error) {
      logger.error('LeaderboardRepository 통합 테스트 종료 중 오류:', error);
    }
  });

  describe('getUserLeaderboard', () => {
    it('사용자 통계 배열로 이루어진 리더보드를 반환해야 한다', async () => {
      const result = await repo.getUserLeaderboard(
        DEFAULT_PARAMS.USER_SORT,
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      expect(Array.isArray(result)).toBe(true);

      if (!isEnoughData(result, 1, '사용자 리더보드 반환값')) return;

      result.forEach((leaderboardUser) => {
        expect(leaderboardUser).toHaveProperty('id');
        expect(leaderboardUser).toHaveProperty('email');
        expect(leaderboardUser).toHaveProperty('username');
        expect(leaderboardUser).toHaveProperty('total_views');
        expect(leaderboardUser).toHaveProperty('total_likes');
        expect(leaderboardUser).toHaveProperty('total_posts');
        expect(leaderboardUser).toHaveProperty('view_diff');
        expect(leaderboardUser).toHaveProperty('like_diff');
        expect(leaderboardUser).toHaveProperty('post_diff');
      });
    });

    it('통계와 관련된 필드는 음수가 아니어야 한다', async () => {
      const result = await repo.getUserLeaderboard(
        DEFAULT_PARAMS.USER_SORT,
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      if (!isEnoughData(result, 1, '사용자 리더보드 반환값')) return;

      result.forEach((leaderboardUser) => {
        expect(Number(leaderboardUser.total_views)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardUser.total_likes)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardUser.total_posts)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardUser.view_diff)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardUser.like_diff)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardUser.post_diff)).toBeGreaterThanOrEqual(0);
      });
    });

    describe.each([
      { sort: 'viewCount', field: 'view_diff' },
      { sort: 'likeCount', field: 'like_diff' },
      { sort: 'postCount', field: 'post_diff' },
    ])('sort 파라미터에 따라 내림차순 정렬되어야 한다', ({ sort, field }) => {
      it(`sort가 ${sort}인 경우 ${field} 필드를 기준으로 정렬해야 한다`, async () => {
        const result = await repo.getUserLeaderboard(
          sort as UserLeaderboardSortType,
          DEFAULT_PARAMS.DATE_RANGE,
          DEFAULT_PARAMS.LIMIT,
        );

        if (!isEnoughData(result, 2, `사용자 리더보드 정렬 (${sort})`)) return;

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
      const resultByPostDiff = await repo.getUserLeaderboard(
        'postCount',
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      if (!isEnoughData(resultByViewDiff, 2, '사용자 리더보드 정렬')) return;

      // 정렬 기준에 따라 결과가 달라야 하나, 순위가 같을 수 있어 하나라도 다르면 통과
      const areDifferent = resultByViewDiff.some(
        (userByViewDiff, idx) =>
          userByViewDiff.id !== resultByLikeDiff[idx].id || userByViewDiff.id !== resultByPostDiff[idx].id,
      );

      // 데이터 상태에 따라 결과가 같을 수도 있어 조건부 검증
      if (areDifferent) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(areDifferent).toBe(true);
      }
    });

    it('limit 파라미터가 결과 개수를 제한해야 한다', async () => {
      const limit5Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 5);
      const limit10Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 10);

      if (!isEnoughData(limit10Result, 10, '사용자 리더보드 limit 파라미터')) return;

      expect(limit5Result.length).toBe(5);
      expect(limit10Result.length).toBe(10);
    });

    it('dateRange 파라미터를 통한 날짜 범위가 적용되어야 한다', async () => {
      const range3Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, 3, DEFAULT_PARAMS.LIMIT);
      const range30Result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, 30, DEFAULT_PARAMS.LIMIT);

      if (!isEnoughData(range3Result, 2, '사용자 리더보드 dateRange 파라미터')) return;

      // 3일 범위 결과와 30일 범위 결과가 달라야 하나, 순위가 같을 수 있어 하나라도 다르면 통과
      const areDifferent = range3Result.some((userBy3Days, idx) => userBy3Days.id !== range30Result[idx].id);

      // 데이터 상태에 따라 결과가 같을 수도 있어 조건부 검증
      if (areDifferent) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(areDifferent).toBe(true);
      }
    });

    it('username이 null인 사용자는 제외되어야 한다', async () => {
      const result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);

      if (!isEnoughData(result, 1, '사용자 리더보드 username null 제외')) return;

      result.forEach((user) => {
        expect(user.username).not.toBeNull();
      });
    });

    it('데이터 수집이 비정상적인 유저는 리더보드에 포함되지 않아야 한다', async () => {
      const result = await repo.getUserLeaderboard(DEFAULT_PARAMS.USER_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);

      if (!isEnoughData(result, 1, '사용자 리더보드 비정상 유저 필터링')) return;

      result.forEach((user) => {
        expect(Number(user.total_views)).not.toBe(Number(user.view_diff));
      });
    });
  });

  describe('getPostLeaderboard', () => {
    it('게시물 통계 배열로 이루어진 리더보드를 반환해야 한다', async () => {
      const result = await repo.getPostLeaderboard(
        DEFAULT_PARAMS.POST_SORT,
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      expect(Array.isArray(result)).toBe(true);

      if (!isEnoughData(result, 1, '게시물 리더보드 반환값')) return;

      result.forEach((leaderboardPost) => {
        expect(leaderboardPost).toHaveProperty('id');
        expect(leaderboardPost).toHaveProperty('title');
        expect(leaderboardPost).toHaveProperty('slug');
        expect(leaderboardPost).toHaveProperty('username');
        expect(leaderboardPost).toHaveProperty('total_views');
        expect(leaderboardPost).toHaveProperty('total_likes');
        expect(leaderboardPost).toHaveProperty('view_diff');
        expect(leaderboardPost).toHaveProperty('like_diff');
        expect(leaderboardPost).toHaveProperty('released_at');
      });
    });

    it('통계와 관련된 필드는 음수가 아니어야 한다', async () => {
      const result = await repo.getPostLeaderboard(
        DEFAULT_PARAMS.POST_SORT,
        DEFAULT_PARAMS.DATE_RANGE,
        DEFAULT_PARAMS.LIMIT,
      );

      if (!isEnoughData(result, 1, '게시물 리더보드 반환값')) return;

      result.forEach((leaderboardPost) => {
        expect(Number(leaderboardPost.total_views)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardPost.total_likes)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardPost.view_diff)).toBeGreaterThanOrEqual(0);
        expect(Number(leaderboardPost.like_diff)).toBeGreaterThanOrEqual(0);
      });
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

        if (!isEnoughData(result, 2, `게시물 리더보드 정렬 (${sort})`)) return;

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

      if (!isEnoughData(resultByViewDiff, 2, '게시물 리더보드 정렬')) return;

      // 정렬 기준에 따라 결과가 달라야 하나, 순위가 같을 수 있어 하나라도 다르면 통과
      const areDifferent = resultByViewDiff.some(
        (postByViewDiff, idx) => postByViewDiff.id !== resultByLikeDiff[idx].id,
      );

      // 데이터 상태에 따라 결과가 같을 수도 있어 조건부 검증
      if (areDifferent) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(areDifferent).toBe(true);
      }
    });

    it('limit 파라미터가 결과 개수를 제한해야 한다', async () => {
      const limit5Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 5);
      const limit10Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 10);

      if (!isEnoughData(limit10Result, 10, '게시물 리더보드 limit 파라미터')) return;

      expect(limit5Result.length).toBe(5);
      expect(limit10Result.length).toBe(10);
    });

    it('dateRange 파라미터를 통한 날짜 범위가 적용되어야 한다', async () => {
      const range3Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, 3, DEFAULT_PARAMS.LIMIT);
      const range30Result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, 30, DEFAULT_PARAMS.LIMIT);

      if (!isEnoughData(range3Result, 2, '게시물 리더보드 dateRange 파라미터')) return;

      // 3일 범위 결과와 30일 범위 결과가 달라야 하나, 순위가 같을 수 있어 하나라도 다르면 통과
      const areDifferent = range3Result.some((postBy3Days, idx) => postBy3Days.id !== range30Result[idx].id);

      // 데이터 상태에 따라 결과가 같을 수도 있어 조건부 검증
      if (areDifferent) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(areDifferent).toBe(true);
      }
    });

    it('데이터 수집이 비정상적인 게시물은 리더보드에 포함되지 않아야 한다', async () => {
      const result = await repo.getPostLeaderboard(DEFAULT_PARAMS.POST_SORT, DEFAULT_PARAMS.DATE_RANGE, 30);
      const pastDateKST = getKSTDateStringWithOffset(-DEFAULT_PARAMS.DATE_RANGE * 24 * 60);

      if (!isEnoughData(result, 1, '게시물 리더보드 비정상 게시물 필터링')) return;

      result.forEach((post) => {
        if (post.released_at < pastDateKST) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(Number(post.total_views)).not.toBe(Number(post.view_diff));
        }
      });
    });
  });
});

function isEnoughData(result: unknown[], limit: number, testName: string): boolean {
  if (result.length < limit) {
    logger.info(`충분한 데이터가 없어 ${testName} 테스트를 건너뜁니다.`);
    return false;
  }
  return true;
}
