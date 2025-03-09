import { Pool, QueryResult } from 'pg';
import { PostRepository } from '@/repositories/post.repository';
import { DBError } from '@/exception';

jest.mock('pg');

const mockPool: {
  query: jest.Mock<Promise<QueryResult<Record<string, unknown>>>, unknown[]>;
} = {
  query: jest.fn(),
};

describe('PostRepository', () => {
  let repo: PostRepository;

  beforeEach(() => {
    repo = new PostRepository(mockPool as unknown as Pool);
  });

  describe('findPostsByUserId', () => {
    it('사용자의 게시글과 nextCursor를 반환해야 한다', async () => {
      const mockPosts = [
        { id: 1, post_released_at: '2025-03-01T00:00:00Z', daily_view_count: 10, daily_like_count: 5 },
        { id: 2, post_released_at: '2025-03-02T00:00:00Z', daily_view_count: 20, daily_like_count: 15 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockPosts,
        rowCount: mockPosts.length,
        command: '',
        oid: 0,
        fields: [],
      } as QueryResult);

      const result = await repo.findPostsByUserId(1, undefined, 'released_at', false);

      expect(result.posts).toEqual(mockPosts);
      expect(result).toHaveProperty('nextCursor');
    });

    it('정렬 순서를 보장해야 한다', async () => {
      const mockPosts = [
        { id: 2, post_released_at: '2025-03-02T00:00:00Z', daily_view_count: 20, daily_like_count: 15 },
        { id: 1, post_released_at: '2025-03-01T00:00:00Z', daily_view_count: 10, daily_like_count: 5 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockPosts,
        rowCount: mockPosts.length,
        command: '',
        oid: 0,
        fields: [],
      } as QueryResult);

      const result = await repo.findPostsByUserId(1, undefined, 'released_at', false);
      expect(result.posts).toEqual(mockPosts);
      expect(result.posts[0].id).toBeGreaterThan(result.posts[1].id);
    });
  });

  describe('getTotalPostCounts', () => {
    it('사용자의 총 게시글 수를 반환해야 한다', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      } as QueryResult);

      const count = await repo.getTotalPostCounts(1);
      expect(count).toBe(10);
    });
  });

  describe('에러 발생 시 처리', () => {
    it('쿼리 실행 중 에러가 발생하면 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));

      await expect(repo.findPostsByUserId(1)).rejects.toThrow(DBError);
      await expect(repo.getTotalPostCounts(1)).rejects.toThrow(DBError);
    });
  });

  describe('getYesterdayAndTodayViewLikeStats', () => {
    it('어제와 오늘의 조회수 및 좋아요 수를 반환해야 한다', async () => {
      const mockStats = {
        daily_view_count: 20,
        daily_like_count: 15,
        yesterday_views: 10,
        yesterday_likes: 8,
        last_updated_date: '2025-03-08T00:00:00Z',
      };

      mockPool.query.mockResolvedValue({
        rows: [mockStats],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      } as QueryResult);

      const result = await repo.getYesterdayAndTodayViewLikeStats(1);
      expect(result).toEqual(mockStats);
    });
  });

  describe('findPostByPostId', () => {
    it('특정 post ID에 대한 통계를 반환해야 한다', async () => {
      const mockStats = [
        { date: '2025-03-08T00:00:00Z', daily_view_count: 50, daily_like_count: 30 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockStats,
        rowCount: mockStats.length,
        command: '',
        oid: 0,
        fields: [],
      } as QueryResult);

      const result = await repo.findPostByPostId(1);
      expect(result).toEqual(mockStats);
    });
  });

  describe('findPostByPostUUID', () => {
    it('특정 post UUID에 대한 통계를 반환해야 한다', async () => {
      const mockStats = [
        { date: '2025-03-08T00:00:00Z', daily_view_count: 50, daily_like_count: 30 },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockStats,
        rowCount: mockStats.length,
        command: '',
        oid: 0,
        fields: [],
      } as QueryResult);

      const result = await repo.findPostByPostUUID('uuid-1234', '2025-03-01', '2025-03-08');
      expect(result).toEqual(mockStats);
    });
  });
});
