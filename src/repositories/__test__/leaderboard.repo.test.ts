import { Pool } from 'pg';
import { DBError, NotFoundError } from '@/exception';
import { UserLeaderboardSortType, PostLeaderboardSortType } from '@/types';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { mockPool, createMockQueryResult } from '@/utils/fixtures';

jest.mock('pg');

describe('LeaderboardRepository', () => {
  let repo: LeaderboardRepository;

  beforeEach(() => {
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
        expect.stringContaining('WHERE date ='), // pastDateKST를 사용하는 부분 확인
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
        expect.stringContaining('WHERE date ='), // pastDateKST를 사용하는 부분 확인
        [expect.any(Number)], // limit
      );
    });

    it('데이터 수집이 비정상적인 게시물은 리더보드에 포함되지 않아야 한다', async () => {
      await repo.getPostLeaderboard('viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ss.post_id IS NOT NULL'),
        expect.anything()
      );
    });

    it('에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));
      await expect(repo.getPostLeaderboard('viewCount', 30, 10)).rejects.toThrow(DBError);
    });
  });

  describe('getUserStats', () => {
    const mockUserStats = {
      username: 'test-user',
      total_views: '1000',
      total_likes: '50',
      total_posts: '10',
      view_diff: '100',
      like_diff: '5',
      post_diff: '2',
    };

    it('특정 사용자의 통계를 반환해야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([mockUserStats]));

      const result = await repo.getUserStats('test-user', 30);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE u.username = $1'), ['test-user']);
      expect(result).toEqual(mockUserStats);
    });

    it('username 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([mockUserStats]));

      await repo.getUserStats('test-user', 30);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('GROUP BY u.username'), ['test-user']);
    });

    it('사용자가 존재하지 않으면 NotFoundError를 던져야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await expect(repo.getUserStats('non-existent', 30)).rejects.toThrow(NotFoundError);
      await expect(repo.getUserStats('non-existent', 30)).rejects.toThrow('사용자를 찾을 수 없습니다: non-existent');
    });

    it('CTE 쿼리가 포함되어야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([mockUserStats]));

      await repo.getUserStats('test-user', 30);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WITH'), expect.anything());
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('today_stats'), expect.anything());
    });

    it('쿼리 에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));

      await expect(repo.getUserStats('test-user', 30)).rejects.toThrow(DBError);
      await expect(repo.getUserStats('test-user', 30)).rejects.toThrow('사용자 통계 조회 중 문제가 발생했습니다.');
    });
  });

  describe('getRecentPosts', () => {
    const mockRecentPosts = [
      {
        title: 'Test Post 1',
        released_at: '2025-01-01',
        today_view: '100',
        today_like: '10',
        view_diff: '20',
      },
      {
        title: 'Test Post 2',
        released_at: '2025-01-02',
        today_view: '200',
        today_like: '20',
        view_diff: '30',
      },
    ];

    it('특정 사용자의 최근 게시글을 반환해야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult(mockRecentPosts));

      const result = await repo.getRecentPosts('test-user', 30, 3);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE u.username = $1'), ['test-user', 3]);
      expect(result).toEqual(mockRecentPosts);
    });

    it('limit 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult(mockRecentPosts));

      await repo.getRecentPosts('test-user', 30, 5);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2'), ['test-user', 5]);
    });

    it('released_at 기준 내림차순 정렬이 포함되어야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult(mockRecentPosts));

      await repo.getRecentPosts('test-user', 30, 3);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY p.released_at DESC'),
        expect.anything(),
      );
    });

    it('CTE 쿼리가 포함되어야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult(mockRecentPosts));

      await repo.getRecentPosts('test-user', 30, 3);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WITH'), expect.anything());
    });

    it('쿼리 에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));

      await expect(repo.getRecentPosts('test-user', 30, 3)).rejects.toThrow(DBError);
      await expect(repo.getRecentPosts('test-user', 30, 3)).rejects.toThrow('최근 게시글 조회 중 문제가 발생했습니다.');
    });
  });
});
