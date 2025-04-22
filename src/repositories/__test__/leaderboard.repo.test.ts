import { DBError } from '@/exception';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { Pool, QueryResult } from 'pg';

jest.mock('pg');

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

  describe('getLeaderboard', () => {
    it('type이 post인 경우 post 데이터를 반환해야 한다.', async () => {
      const mockResult = [
        {
          id: 2,
          title: 'test2',
          slug: 'test2',
          total_views: 200,
          total_likes: 100,
          view_diff: 20,
          like_diff: 10,
          released_at: '2025-01-02',
        },
        {
          id: 1,
          title: 'test',
          slug: 'test',
          total_views: 100,
          total_likes: 50,
          view_diff: 10,
          like_diff: 5,
          released_at: '2025-01-01',
        },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockResult,
        rowCount: mockResult.length,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('post', 'viewCount', 30, 10);

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('FROM posts_post p'), expect.anything());
    });

    it('type이 user인 경우 user 데이터를 반환해야 한다.', async () => {
      const mockResult = [
        {
          id: 1,
          email: 'test@test.com',
          total_views: 100,
          total_likes: 50,
          total_posts: 1,
          view_diff: 20,
          like_diff: 10,
          post_diff: 1,
        },
        {
          id: 2,
          email: 'test2@test.com',
          total_views: 200,
          total_likes: 100,
          total_posts: 2,
          view_diff: 10,
          like_diff: 5,
          post_diff: 1,
        },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockResult,
        rowCount: mockResult.length,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('user', 'viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('FROM users_user u'), expect.anything());
      expect(result).toEqual(mockResult);
    });

    it('sort가 조회수인 경우 정렬 순서를 보장해야 한다.', async () => {
      const mockResult = [
        { view_diff: 20, like_diff: 5, post_diff: 1 },
        { view_diff: 10, like_diff: 10, post_diff: 2 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockResult,
        rowCount: mockResult.length,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('user', 'viewCount', 30, 10);

      expect(result).toEqual(mockResult);
      expect(result[0].view_diff).toBeGreaterThan(result[1].view_diff);
    });

    it('sort가 좋아요 수인 경우 정렬 순서를 보장해야 한다.', async () => {
      const mockResult = [
        { view_diff: 10, like_diff: 10, post_diff: 1 },
        { view_diff: 20, like_diff: 5, post_diff: 1 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockResult,
        rowCount: mockResult.length,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('user', 'likeCount', 30, 10);

      expect(result).toEqual(mockResult);
      expect(result[0].like_diff).toBeGreaterThan(result[1].like_diff);
    });

    it('sort가 게시물 수인 경우 정렬 순서를 보장해야 한다.', async () => {
      const mockResult = [
        { view_diff: 10, like_diff: 10, post_diff: 4 },
        { view_diff: 20, like_diff: 5, post_diff: 1 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockResult,
        rowCount: mockResult.length,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('user', 'postCount', 30, 10);

      expect(result).toEqual(mockResult);
      expect(result[0].post_diff).toBeGreaterThan(result[1].post_diff);
    });

    it('limit 만큼의 데이터만 반환해야 한다', async () => {
      const mockData = [
        { id: 1, title: 'test' },
        { id: 2, title: 'test2' },
        { id: 3, title: 'test3' },
        { id: 4, title: 'test4' },
        { id: 5, title: 'test5' },
      ];
      const mockLimit = 5;

      mockPool.query.mockResolvedValue({
        rows: mockData,
        rowCount: mockData.length,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('post', 'viewCount', 30, mockLimit);

      expect(result).toEqual(mockData);
      expect(result.length).toEqual(mockLimit);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        expect.arrayContaining([30, mockLimit]),
      );
    });

    it('type이 post이고 sort가 게시물 수인 경우 조회수를 기준으로 정렬해야 한다.', async () => {
      const mockResult = [
        { total_views: 200, total_likes: 5, view_diff: 20, like_diff: 0 },
        { total_views: 100, total_likes: 50, view_diff: 10, like_diff: 5 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockResult,
        rowCount: mockResult.length,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('post', 'postCount', 30, 10);

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY view_diff DESC'),
        expect.anything(),
      );
      expect(result[0].view_diff).toBeGreaterThan(result[1].view_diff);
    });

    it('user 타입에는 GROUP BY 절이 포함되어야 한다', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult);

      await repo.getLeaderboard('user', 'viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('GROUP BY u.id, u.email'), expect.anything());
    });

    it('post 타입에는 GROUP BY 절이 포함되지 않아야 한다', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult);

      await repo.getLeaderboard('post', 'viewCount', 30, 10);

      expect(mockPool.query).toHaveBeenCalledWith(expect.not.stringContaining('GROUP BY'), expect.anything());
    });

    it('dateRange 파라미터가 쿼리에 올바르게 적용되어야 한다', async () => {
      const mockResult = [{ id: 1 }];
      const testDateRange = 30;

      mockPool.query.mockResolvedValue({
        rows: mockResult,
        rowCount: mockResult.length,
      } as unknown as QueryResult);

      await repo.getLeaderboard('user', 'viewCount', testDateRange, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('$1::int'),
        expect.arrayContaining([testDateRange, expect.anything()]),
      );
    });

    it('데이터가 없는 경우 빈 배열을 반환해야 한다', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult);

      const result = await repo.getLeaderboard('user', 'viewCount', 30, 10);

      expect(result).toEqual([]);
    });

    it('에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));
      await expect(repo.getLeaderboard('post', 'postCount', 30, 10)).rejects.toThrow(DBError);
    });
  });
});
