import { Pool, QueryResult } from 'pg';
import { DBError } from '@/exception';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';

jest.mock('pg');

// pg의 QueryResult 타입을 만족하는 mock 객체를 생성하기 위한 헬퍼 함수 생성
function createMockQueryResult<T extends Record<string, unknown>>(rows: T[]): QueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
    command: '',
    oid: 0,
    fields: [],
  } satisfies QueryResult<T>;
}

const mockPool: {
  query: jest.Mock<Promise<QueryResult<Record<string, unknown>>>, unknown[]>;
} = {
  query: jest.fn(),
};

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

    it('sort가 viewCount인 경우 view_diff 필드를 기준으로 내림차순 정렬해야 한다', async () => {
      await repo.getUserLeaderboard('viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY view_diff DESC'),
        expect.anything(),
      );
    });

    it('sort가 likeCount인 경우 like_diff 필드를 기준으로 내림차순 정렬해야 한다', async () => {
      await repo.getUserLeaderboard('likeCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY like_diff DESC'),
        expect.anything(),
      );
    });

    it('sort가 postCount인 경우 post_diff 필드를 기준으로 내림차순 정렬해야 한다', async () => {
      await repo.getUserLeaderboard('postCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY post_diff DESC'),
        expect.anything(),
      );
    });

    it('limit 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockLimit = 5;

      await repo.getUserLeaderboard('viewCount', 30, mockLimit);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        expect.arrayContaining([30, mockLimit]),
      );
    });

    it('dateRange 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockDateRange = 30;

      await repo.getUserLeaderboard('viewCount', mockDateRange, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('make_interval(days := $1::int)'),
        expect.arrayContaining([mockDateRange, expect.anything()]),
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

    it('sort가 viewCount인 경우 view_diff 필드를 기준으로 내림차순 정렬해야 한다', async () => {
      await repo.getPostLeaderboard('viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY view_diff DESC'),
        expect.anything(),
      );
    });

    it('sort가 likeCount인 경우 like_diff 필드를 기준으로 내림차순 정렬해야 한다', async () => {
      await repo.getPostLeaderboard('likeCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY like_diff DESC'),
        expect.anything(),
      );
    });

    it('limit 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockLimit = 5;

      await repo.getPostLeaderboard('viewCount', 30, mockLimit);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        expect.arrayContaining([30, mockLimit]),
      );
    });

    it('dateRange 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockDateRange = 30;

      await repo.getPostLeaderboard('viewCount', mockDateRange, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('make_interval(days := $1::int)'),
        expect.arrayContaining([mockDateRange, expect.anything()]),
      );
    });

    it('에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));
      await expect(repo.getPostLeaderboard('viewCount', 30, 10)).rejects.toThrow(DBError);
    });
  });
});
