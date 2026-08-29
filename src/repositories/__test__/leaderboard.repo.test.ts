import { Pool } from 'pg';
import { DBError } from '@/exception';
import { UserLeaderboardSortType, PostLeaderboardSortType } from '@/types';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { mockPool, createMockQueryResult } from '@/utils/fixtures';
import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '@/utils/date.util';

jest.mock('pg');

// 날짜 유틸을 고정하지 않으면 실제 현재 시각이 쿼리에 박혀 값 단언이 불가능해진다.
jest.mock('@/utils/date.util', () => ({
  getCurrentKSTDateString: jest.fn(),
  getKSTDateStringWithOffset: jest.fn(),
}));

const TODAY_KST = '2026-08-26 00:00:00+09';
const YESTERDAY_KST = '2026-08-25 00:00:00+09';
const PAST_KST = '2026-07-27 00:00:00+09';

describe('LeaderboardRepository', () => {
  let repo: LeaderboardRepository;

  beforeEach(() => {
    // mockReturnValue 를 두지 않으면 undefined 가 쿼리에 박혀도 기존 단언이 통과해버린다.
    (getCurrentKSTDateString as jest.Mock).mockReturnValue(TODAY_KST);
    (getKSTDateStringWithOffset as jest.Mock).mockImplementation((minutes: number) =>
      minutes === -24 * 60 ? YESTERDAY_KST : PAST_KST,
    );

    repo = new LeaderboardRepository(mockPool as unknown as Pool);
  });

  describe('getUserLeaderboard', () => {
    it('사용자 통계 배열로 이루어진 리더보드를 반환해야 한다', async () => {
      const mockResult = [
        {
          id: '1',
          email: 'test@test.com',
          username: 'test',
          total_views: 100,
          total_likes: 50,
          total_posts: 1,
          view_diff: 20,
          like_diff: 10,
          post_diff: 1,
        },
        {
          id: '2',
          email: 'test2@test.com',
          username: 'test2',
          total_views: 200,
          total_likes: 100,
          total_posts: 2,
          view_diff: 10,
          like_diff: 5,
          post_diff: 1,
        },
      ];
      mockPool.query.mockResolvedValue(createMockQueryResult(mockResult));

      const result = await repo.getUserLeaderboard('viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('FROM users_user u'), expect.anything());
      expect(result).toEqual(mockResult);
    });

    describe.each([
      { sort: 'viewCount', field: 'view_diff' },
      { sort: 'likeCount', field: 'like_diff' },
      { sort: 'postCount', field: 'post_diff' },
    ])('sort 파라미터에 따라 내림차순 정렬되어야 한다', ({ sort, field }) => {
      it(`sort가 ${sort}인 경우 ${field} 필드를 기준으로 정렬해야 한다`, async () => {
        await repo.getUserLeaderboard(sort as UserLeaderboardSortType, 30, 10);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining(`ORDER BY ${field} DESC`),
          expect.anything(),
        );
      });
    });

    it('limit 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockLimit = 5;

      await repo.getUserLeaderboard('viewCount', 30, mockLimit);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        expect.arrayContaining([mockLimit]),
      );
    });

    it('dateRange 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockDateRange = 30;

      await repo.getUserLeaderboard('viewCount', mockDateRange, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(`WHERE date = '${PAST_KST}'`), // 기준일 CTE 가 pastDateKST 를 쓰는지 값으로 확인
        [expect.any(Number)], // limit
      );
    });

    it('데이터 수집이 비정상적인 유저는 리더보드에 포함되지 않아야 한다', async () => {
      await repo.getUserLeaderboard('viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('HAVING SUM(COALESCE(ss.start_view, 0)) != 0'),
        expect.anything(),
      );
    });

    it('에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));
      await expect(repo.getUserLeaderboard('viewCount', 30, 10)).rejects.toThrow(DBError);
    });
  });

  describe('today_stats CTE', () => {
    /** today_stats 블록만 잘라낸다 (start_stats 직전까지) */
    const extractTodayStats = (query: string): string =>
      query.slice(query.indexOf('today_stats AS'), query.indexOf('start_stats AS'));

    afterEach(() => {
      jest.useRealTimers();
    });

    it('시스템 시각과 무관하게 항상 같은 블록을 만들어야 한다', async () => {
      // 배치가 하루 종일 50분 주기로 돌기 때문에 현재 시각만 보고 배치가 끝났는지 알 수 없다.
      // UTC 15시대(KST 00시대) 앞뒤로 시각을 옮겨도 쿼리가 달라지면 안 된다.
      const moments = ['2026-08-25T14:59:00Z', '2026-08-25T15:30:00Z', '2026-08-25T16:01:00Z'];
      const blocks: string[] = [];

      jest.useFakeTimers();
      for (const moment of moments) {
        jest.setSystemTime(new Date(moment));
        mockPool.query.mockClear();
        mockPool.query.mockResolvedValue(createMockQueryResult([]));

        await repo.getUserLeaderboard('viewCount', 30, 10);
        blocks.push(extractTodayStats(mockPool.query.mock.calls[0][0] as string));
      }

      expect(new Set(blocks).size).toBe(1);
    });
  });

  describe('getPostLeaderboard', () => {
    it('게시물 통계 배열로 이루어진 리더보드를 반환해야 한다', async () => {
      const mockResult = [
        {
          id: '2',
          title: 'test2',
          slug: 'test2',
          username: 'test2',
          total_views: 200,
          total_likes: 100,
          view_diff: 20,
          like_diff: 10,
          released_at: '2025-01-02',
        },
        {
          id: '1',
          title: 'test',
          slug: 'test',
          username: 'test',
          total_views: 100,
          total_likes: 50,
          view_diff: 10,
          like_diff: 5,
          released_at: '2025-01-01',
        },
      ];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockResult));

      const result = await repo.getPostLeaderboard('viewCount', 30, 10);

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('FROM posts_post p'), expect.anything());
    });

    describe.each([
      { sort: 'viewCount', field: 'view_diff' },
      { sort: 'likeCount', field: 'like_diff' },
    ])('sort 파라미터에 따라 내림차순 정렬되어야 한다', ({ sort, field }) => {
      it(`sort가 ${sort}인 경우 ${field} 필드를 기준으로 정렬해야 한다`, async () => {
        await repo.getPostLeaderboard(sort as PostLeaderboardSortType, 30, 10);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining(`ORDER BY ${field} DESC`),
          expect.anything(),
        );
      });
    });

    it('limit 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockLimit = 5;

      await repo.getPostLeaderboard('viewCount', 30, mockLimit);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        expect.arrayContaining([mockLimit]),
      );
    });

    it('dateRange 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockDateRange = 30;

      await repo.getPostLeaderboard('viewCount', mockDateRange, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(`WHERE date = '${PAST_KST}'`), // 기준일 CTE 가 pastDateKST 를 쓰는지 값으로 확인
        [expect.any(Number)], // limit
      );
    });

    it('데이터 수집이 비정상적인 게시물은 리더보드에 포함되지 않아야 한다', async () => {
      await repo.getPostLeaderboard('viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('ss.post_id IS NOT NULL'), expect.anything());
    });

    it('에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));
      await expect(repo.getPostLeaderboard('viewCount', 30, 10)).rejects.toThrow(DBError);
    });
  });
});
