import { Pool } from 'pg';
import { PostRepository } from '@/repositories/post.repository';
import { DBError } from '@/exception';
import { mockPool, createMockQueryResult } from '@/utils/fixtures';

jest.mock('pg');

describe('PostRepository', () => {
  let repo: PostRepository;

  beforeEach(() => {
    repo = new PostRepository(mockPool as unknown as Pool);
    jest.clearAllMocks();
  });

  describe('findPostsByUserId', () => {
    it('사용자의 게시글과 nextCursor를 반환해야 한다', async () => {
      const mockPosts = [
        { id: 1, post_released_at: '2025-03-01T00:00:00Z', daily_view_count: 10, daily_like_count: 5 },
        { id: 2, post_released_at: '2025-03-02T00:00:00Z', daily_view_count: 20, daily_like_count: 15 },
      ];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockPosts));

      const result = await repo.findPostsByUserId(1, undefined, 'released_at', false);

      expect(result.posts).toEqual(mockPosts);
      expect(result).toHaveProperty('nextCursor');
    });

    it('정렬 순서를 보장해야 한다', async () => {
      const mockPosts = [
        { id: 2, post_released_at: '2025-03-02T00:00:00Z', daily_view_count: 20, daily_like_count: 15 },
        { id: 1, post_released_at: '2025-03-01T00:00:00Z', daily_view_count: 10, daily_like_count: 5 },
      ];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockPosts));

      const result = await repo.findPostsByUserId(1, undefined, 'released_at', false);
      expect(result.posts).toEqual(mockPosts);
      expect(result.posts[0].id).toBeGreaterThan(result.posts[1].id);
    });

    it('쿼리에 is_active = TRUE 조건이 포함되어야 한다', async () => {
      const mockPosts = [
        { id: 1, post_released_at: '2025-03-01T00:00:00Z', daily_view_count: 10, daily_like_count: 5 },
      ];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockPosts));

      await repo.findPostsByUserId(1);

      // 쿼리 호출 확인
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('p.is_active = TRUE'), expect.anything());
    });
  });

  describe('findPostsByUserIdWithGrowthMetrics', () => {
    it('트래픽 성장률 데이터를 포함한 게시글 목록을 반환해야 한다', async () => {
      const mockPosts = [
        {
          id: 1,
          post_released_at: '2025-03-01T00:00:00Z',
          daily_view_count: 30,
          yesterday_daily_view_count: 10,
          view_growth: 20,
          like_growth: 5,
        },
        {
          id: 2,
          post_released_at: '2025-03-02T00:00:00Z',
          daily_view_count: 25,
          yesterday_daily_view_count: 15,
          view_growth: 10,
          like_growth: 3,
        },
      ];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockPosts));

      const result = await repo.findPostsByUserIdWithGrowthMetrics(1);

      expect(result.posts).toEqual(mockPosts);
      expect(result).toHaveProperty('nextCursor');
      expect(result.posts[0]).toHaveProperty('view_growth');
      expect(result.posts[0]).toHaveProperty('like_growth');
    });

    it('트래픽 성장률을 기준으로 내림차순 정렬해야 한다', async () => {
      const mockPosts = [
        {
          id: 1,
          post_released_at: '2025-03-01T00:00:00Z',
          daily_view_count: 30,
          yesterday_daily_view_count: 10,
          view_growth: 20,
        },
        {
          id: 2,
          post_released_at: '2025-03-02T00:00:00Z',
          daily_view_count: 25,
          yesterday_daily_view_count: 15,
          view_growth: 10,
        },
      ];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockPosts));

      const result = await repo.findPostsByUserIdWithGrowthMetrics(1, undefined, false);
      expect(result.posts).toEqual(mockPosts);
      expect(result.posts[0].view_growth).toBeGreaterThan(result.posts[1].view_growth);
    });

    it('커서 기반 페이지네이션이 트래픽 성장률 기준으로 작동해야 한다', async () => {
      const mockPosts = [
        {
          id: 3,
          post_released_at: '2025-03-03T00:00:00Z',
          daily_view_count: 20,
          yesterday_daily_view_count: 15,
          view_growth: 5,
        },
      ];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockPosts));

      const result = await repo.findPostsByUserIdWithGrowthMetrics(1, '10,2', false);
      expect(result.posts).toEqual(mockPosts);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          '(COALESCE(pds.daily_view_count, 0) - COALESCE(yesterday_stats.daily_view_count, 0)) < $2',
        ),
        expect.arrayContaining([1, '10', '2', expect.anything()]),
      );
    });

    it('에러 발생 시 DBError를 던져야 한다', async () => {
      mockPool.query.mockRejectedValue(new Error('DB connection failed'));
      await expect(repo.findPostsByUserIdWithGrowthMetrics(1)).rejects.toThrow(DBError);
    });

    it('쿼리에 is_active = TRUE 조건이 포함되어야 한다', async () => {
      const mockPosts = [{ id: 1, view_growth: 20, like_growth: 5 }];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockPosts));

      await repo.findPostsByUserIdWithGrowthMetrics(1);

      // 쿼리 호출 확인
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('p.is_active = TRUE'), expect.anything());
    });
  });

  describe('getTotalPostCounts', () => {
    it('사용자의 총 게시글 수를 반환해야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([{ count: '10' }]));

      const count = await repo.getTotalPostCounts(1);
      expect(count).toBe(10);
    });

    it('is_active = TRUE인 게시물만 카운트해야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([{ count: '5' }]));

      await repo.getTotalPostCounts(1);

      // 쿼리 호출 확인
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('is_active = TRUE'), expect.anything());
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

      mockPool.query.mockResolvedValue(createMockQueryResult([mockStats]));

      const result = await repo.getYesterdayAndTodayViewLikeStats(1);
      expect(result).toEqual(mockStats);
    });

    it('is_active = TRUE인 게시물의 통계만 반환해야 한다', async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([{ daily_view_count: 20, daily_like_count: 15 }]));

      await repo.getYesterdayAndTodayViewLikeStats(1);

      // 쿼리 호출 확인
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('p.is_active = TRUE'), expect.anything());
    });
  });

  describe('findPostByPostId', () => {
    it('특정 post ID에 대한 통계를 반환해야 한다', async () => {
      const mockStats = [{ date: '2025-03-08T00:00:00Z', daily_view_count: 50, daily_like_count: 30 }];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockStats));

      const result = await repo.findPostByPostId(1, '2025-05-01', '2025-05-08');
      expect(result).toEqual(mockStats);
    });
  });

  describe('findPostByPostUUID', () => {
    it('특정 post UUID에 대한 통계를 반환해야 한다', async () => {
      const mockStats = [{ date: '2025-03-08T00:00:00Z', daily_view_count: 50, daily_like_count: 30 }];

      mockPool.query.mockResolvedValue(createMockQueryResult(mockStats));

      const result = await repo.findPostByPostUUID('uuid-1234', '2025-03-01', '2025-03-08');
      expect(result).toEqual(mockStats);
    });
  });
});
