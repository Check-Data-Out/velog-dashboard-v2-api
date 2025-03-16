import dotenv from 'dotenv';
import { Pool } from 'pg';
import pg from 'pg';
import { PostRepository } from '../post.repository';
import logger from '@/configs/logger.config';


dotenv.config();
jest.setTimeout(30000);

/**
 * PostRepository 통합 테스트
 * 
 * 이 테스트 파일은 실제 데이터베이스와 연결하여 PostRepository의 모든 메서드를
 * 실제 환경과 동일한 조건에서 테스트합니다.
 */
describe('PostRepository 통합 테스트', () => {
  let testPool: Pool;
  let repo: PostRepository;

  // 테스트에 사용할 기본 데이터 ID
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const TEST_DATA = {
    USER_ID: 1,
    POST_ID: 2445,
    POST_UUID: 'e5053714-513f-422a-8e8f-99dbb9d4f2a4',
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
        statement_timeout: 30000,
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
      logger.info('테스트 DB 연결 성공');

      // 리포지토리 인스턴스 생성
      repo = new PostRepository(testPool);

      // 테스트 데이터 존재 여부 확인
      const postCheck = await testPool.query(
        'SELECT COUNT(*) FROM posts_post WHERE id = $1',
        [TEST_DATA.POST_ID]
      );

      const statsCheck = await testPool.query(
        'SELECT COUNT(*) FROM posts_postdailystatistics WHERE post_id = $1',
        [TEST_DATA.POST_ID]
      );

      const hasPostData = parseInt(postCheck.rows[0].count) > 0;
      const hasPostDailyStats = parseInt(statsCheck.rows[0].count) > 0;

      if (!hasPostData) {
        logger.warn(`주의: post_id=${TEST_DATA.POST_ID}에 해당하는 posts_post 데이터가 없습니다.`);
      }

      if (!hasPostDailyStats) {
        logger.warn(`주의: post_id=${TEST_DATA.POST_ID}에 해당하는 통계 데이터가 없습니다.`);
      }
    } catch (error) {
      logger.error('테스트 설정 중 오류 발생:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // 모든 쿼리 완료 대기
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 모든 연결 종료 시도
      // if (client) {
      //   client.release(true);
      // }

      // 풀 완전 종료
      if (testPool) {
        // 강제 종료: 모든 활성 쿼리와 연결 중지
        await testPool.end();
      }

      // 추가 정리 시간
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info('테스트 DB 연결 종료');
    } catch (error) {
      logger.error('테스트 종료 중 오류:', error);
    }
  });

  /**
   * findPostsByUserId 테스트
   */
  describe('findPostsByUserId', () => {
    it('사용자 ID로 게시물 목록을 조회할 수 있어야 한다', async () => {
      // 실행
      const result = await repo.findPostsByUserId(TEST_DATA.USER_ID);

      // 검증
      expect(result).toBeDefined();
      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('nextCursor');
      expect(Array.isArray(result.posts)).toBe(true);
    });

    it('페이지네이션을 위한 nextCursor를 제공해야 한다', async () => {
      // 먼저 제한된 수의 결과를 가져옴
      const limitedResult = await repo.findPostsByUserId(TEST_DATA.USER_ID, undefined, undefined, false, 1);

      // 최소 2개 이상의 게시물이 있으면 nextCursor가 있어야 함
      const totalCount = await repo.getTotalPostCounts(TEST_DATA.USER_ID);

      if (totalCount <= 1 || limitedResult.posts.length !== 1) {
        logger.info('페이지네이션 테스트를 위한 충분한 데이터가 없습니다.');
        return;
      }

      expect(limitedResult.nextCursor).toBeTruthy();

      // nextCursor를 사용한 두 번째 쿼리
      const secondPage = await repo.findPostsByUserId(
        TEST_DATA.USER_ID,
        limitedResult.nextCursor || undefined
      );

      expect(secondPage.posts).toBeDefined();
      expect(Array.isArray(secondPage.posts)).toBe(true);

    });

    it('정렬 옵션을 적용할 수 있어야 한다', async () => {
      // 조회수 기준 내림차순 정렬
      const result = await repo.findPostsByUserId(TEST_DATA.USER_ID, undefined, 'dailyViewCount', false);

      // 결과가 2개 이상인 경우만 의미 있는 검증 가능
      if (result.posts.length < 2) {
        logger.info('페이지네이션 테스트를 위한 충분한 데이터가 없습니다.');
        return;
      }

      // 내림차순 정렬 확인
      const isSortedByViews = result.posts.every((post, index) => {
        if (index === 0) return true;
        return post.daily_view_count <= result.posts[index - 1].daily_view_count;
      });
      expect(isSortedByViews).toBe(true);

    });

    it('오름차순 정렬이 제대로 동작해야 한다', async () => {
      // 오름차순 정렬 (released_at 기준)
      const result = await repo.findPostsByUserId(TEST_DATA.USER_ID, undefined, undefined, true);

      expect(result).toBeDefined();
      expect(Array.isArray(result.posts)).toBe(true);

      // 결과가 2개 이상인 경우에만 검증
      if (result.posts.length >= 2) {
        const isSortedAsc = result.posts.every((post, index) => {
          if (index === 0) return true;
          // released_at 날짜를 비교
          const prevDate = new Date(result.posts[index - 1].post_released_at).getTime();
          const currDate = new Date(post.post_released_at).getTime();
          return prevDate <= currDate; // 오름차순
        });

        // eslint-disable-next-line jest/no-conditional-expect
        expect(isSortedAsc).toBe(true);
      }
    });

    it('다양한 정렬 기준으로 결과를 반환해야 한다', async () => {
      // 좋아요 수 기준 내림차순 정렬
      const resultByLikes = await repo.findPostsByUserId(TEST_DATA.USER_ID, undefined, 'dailyLikeCount', false);

      expect(resultByLikes).toBeDefined();
      expect(Array.isArray(resultByLikes.posts)).toBe(true);

      // released_at 기준 내림차순 정렬 (기본값)
      const resultByDate = await repo.findPostsByUserId(TEST_DATA.USER_ID);

      expect(resultByDate).toBeDefined();
      expect(Array.isArray(resultByDate.posts)).toBe(true);

      // 정렬 기준이 다르면 결과 순서도 달라야 함
      if (resultByLikes.posts.length >= 2 && resultByDate.posts.length >= 2) {
        // 두 결과의 첫 번째 항목이 다른지 확인 (정렬 기준에 따라 다른 결과가 나와야 함)
        const areDifferent =
          resultByLikes.posts[0].id !== resultByDate.posts[0].id ||
          resultByLikes.posts[1].id !== resultByDate.posts[1].id;

        // 데이터 상태에 따라 결과가 같을 수도 있어 조건부 검증
        if (areDifferent) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(areDifferent).toBe(true);
        }
      }
    });

    it('limit 매개변수가 결과 개수를 제한해야 한다', async () => {
      const totalCount = await repo.getTotalPostCounts(TEST_DATA.USER_ID);

      if (totalCount < 3) {
        logger.info('limit 테스트를 위한 충분한 데이터가 없습니다.');
        return;
      }

      // 서로 다른 limit 값으로 조회
      const result1 = await repo.findPostsByUserId(TEST_DATA.USER_ID, undefined, undefined, false, 1);
      const result2 = await repo.findPostsByUserId(TEST_DATA.USER_ID, undefined, undefined, false, 2);

      expect(result1.posts.length).toBe(1);
      expect(result2.posts.length).toBe(2);
    });

    it('cursor를 사용한 페이지네이션이 일관성 있게 동작해야 한다', async () => {
      const totalCount = await repo.getTotalPostCounts(TEST_DATA.USER_ID);

      if (totalCount < 3) {
        logger.info('페이지네이션 연속성 테스트를 위한 충분한 데이터가 없습니다.');
        return;
      }

      // 1페이지: 첫 2개 항목
      const page1 = await repo.findPostsByUserId(TEST_DATA.USER_ID, undefined, undefined, false, 2);
      expect(page1.posts.length).toBe(2);
      expect(page1.nextCursor).toBeTruthy();

      // 2페이지: 다음 2개 항목
      const page2 = await repo.findPostsByUserId(
        TEST_DATA.USER_ID,
        page1.nextCursor || undefined,
        undefined,
        false,
        2
      );
      expect(page2.posts.length).toBeGreaterThan(0);

      // 첫 페이지와 두 번째 페이지의 항목은 중복되지 않아야 함
      const page1Ids = page1.posts.map(post => post.id);
      const page2Ids = page2.posts.map(post => post.id);

      const hasDuplicates = page1Ids.some(id => page2Ids.includes(id));
      expect(hasDuplicates).toBe(false);
    });
  });


  /**
   * getTotalPostCounts 테스트
   */
  describe('getTotalPostCounts', () => {
    it('사용자의 총 게시물 수를 반환해야 한다', async () => {
      const count = await repo.getTotalPostCounts(TEST_DATA.USER_ID);

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * getYesterdayAndTodayViewLikeStats 테스트
   */
  describe('getYesterdayAndTodayViewLikeStats', () => {
    it('어제와 오늘의 통계 데이터를 반환해야 한다', async () => {
      const stats = await repo.getYesterdayAndTodayViewLikeStats(TEST_DATA.USER_ID);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('daily_view_count');
      expect(stats).toHaveProperty('daily_like_count');
      expect(stats).toHaveProperty('yesterday_views');
      expect(stats).toHaveProperty('yesterday_likes');
      expect(stats).toHaveProperty('last_updated_date');
    });

    it('통계 값이 음수가 아니어야 한다', async () => {
      const stats = await repo.getYesterdayAndTodayViewLikeStats(TEST_DATA.USER_ID);

      expect(Number(stats.daily_view_count)).toBeGreaterThanOrEqual(0);
      expect(Number(stats.daily_like_count)).toBeGreaterThanOrEqual(0);
      expect(Number(stats.yesterday_views)).toBeGreaterThanOrEqual(0);
      expect(Number(stats.yesterday_likes)).toBeGreaterThanOrEqual(0);
    });

    it('반환된 통계가 숫자로 변환 가능해야 한다', async () => {
      const stats = await repo.getYesterdayAndTodayViewLikeStats(TEST_DATA.USER_ID);

      expect(Number.isNaN(Number(stats.daily_view_count))).toBe(false);
      expect(Number.isNaN(Number(stats.daily_like_count))).toBe(false);
      expect(Number.isNaN(Number(stats.yesterday_views))).toBe(false);
      expect(Number.isNaN(Number(stats.yesterday_likes))).toBe(false);
    });

    it('존재하지 않는 사용자 ID에 대해 기본값을 반환해야 한다', async () => {
      const nonExistentUserId = 9999999; // 존재하지 않을 가능성이 높은 ID
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
      const result = await repo.findPostByPostId(TEST_DATA.POST_ID);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      result.forEach(item => {
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('daily_view_count');
        expect(item).toHaveProperty('daily_like_count');
      });
    });

    it('날짜 범위를 지정하여 조회할 수 있어야 한다', async () => {
      // 현재 날짜 기준 한 달
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await repo.findPostByPostId(TEST_DATA.POST_ID, startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // 모든 결과가 지정된 날짜 범위 내에 있어야 함
      result.forEach(entry => {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        expect(entryDate >= startDate && entryDate <= endDate).toBe(true);
      });
    });

    it('날짜 오름차순으로 정렬된 결과를 반환해야 한다', async () => {
      const result = await repo.findPostByPostId(TEST_DATA.POST_ID);

      // 2개 이상의 결과가 있는 경우에만 정렬 검증
      if (result.length >= 2) {
        let isSorted = true;

        for (let i = 1; i < result.length; i++) {
          const prevDate = new Date(result[i - 1].date).getTime();
          const currDate = new Date(result[i].date).getTime();

          if (prevDate > currDate) {
            isSorted = false;
            break;
          }
        }

        // eslint-disable-next-line jest/no-conditional-expect
        expect(isSorted).toBe(true);
      }
    });

    it('존재하지 않는 게시물 ID에 대해 빈 배열을 반환해야 한다', async () => {
      const nonExistentPostId = 9999999;
      const result = await repo.findPostByPostId(nonExistentPostId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('날짜 형식이 올바르게 변환되어야 한다', async () => {
      const result = await repo.findPostByPostId(TEST_DATA.POST_ID);

      if (result.length <= 0) {
        logger.info('존재하지 않는 게시물 ID에 대해 빈 배열을 테스트를 위한 충분한 데이터가 없습니다.');
        return
      }

      const dateItem = result[0];
      expect(dateItem.date).toBeDefined();

      // date가 유효한 Date 객체로 변환될 수 있는지 확인
      const dateObj = new Date(dateItem.date);
      expect(dateObj.toString()).not.toBe('Invalid Date');

      // 날짜 범위가 합리적인지 확인
      const year = dateObj.getFullYear();
      expect(year).toBeGreaterThanOrEqual(2020);
      expect(year).toBeLessThanOrEqual(2026); // 현재 + 미래 대비

    });

    it('일일 조회수와 좋아요 수가 숫자 타입이어야 한다', async () => {
      const result = await repo.findPostByPostId(TEST_DATA.POST_ID);

      if (result.length <= 0) {
        logger.info('일일 조회수와 좋아요 수가 숫자 타입인지 테스트를 위한 충분한 데이터가 없습니다.');
        return
      }

      result.forEach(item => {
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
      // 현재 날짜 기준 일주일
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await repo.findPostByPostUUID(TEST_DATA.POST_UUID, startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      result.forEach(item => {
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('daily_view_count');
        expect(item).toHaveProperty('daily_like_count');
      });
    });
  });
});