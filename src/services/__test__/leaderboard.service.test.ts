import { Pool } from 'pg';
import { DBError } from '@/exception';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { LEADERBOARD_CACHE_TTL, LeaderboardService } from '@/services/leaderboard.service';
import { ICache } from '@/modules/cache/cache.type';

jest.mock('@/repositories/leaderboard.repository');
jest.mock('@/configs/cache.config', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockRepo: jest.Mocked<LeaderboardRepository>;
  let mockPool: jest.Mocked<Pool>;
  let mockCache: jest.Mocked<ICache>;

  beforeEach(() => {
    const mockPoolObj = {};
    mockPool = mockPoolObj as jest.Mocked<Pool>;

    const repoInstance = new LeaderboardRepository(mockPool);
    mockRepo = repoInstance as jest.Mocked<LeaderboardRepository>;

    const { cache } = jest.requireMock('@/configs/cache.config');
    mockCache = cache as jest.Mocked<ICache>;

    service = new LeaderboardService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserLeaderboard', () => {
    const mockRawResult = [
      {
        id: '1',
        email: 'test@test.com',
        username: 'test',
        total_views: '100',
        total_likes: '50',
        total_posts: '1',
        view_diff: '20',
        like_diff: '10',
        post_diff: '1',
      },
      {
        id: '2',
        email: 'test2@test.com',
        username: 'test2',
        total_views: '200',
        total_likes: '100',
        total_posts: '2',
        view_diff: '10',
        like_diff: '5',
        post_diff: '1',
      },
    ];

    const mockResult = {
      users: [
        {
          id: '1',
          email: 'test@test.com',
          username: 'test',
          totalViews: 100,
          totalLikes: 50,
          totalPosts: 1,
          viewDiff: 20,
          likeDiff: 10,
          postDiff: 1,
        },
        {
          id: '2',
          email: 'test2@test.com',
          username: 'test2',
          totalViews: 200,
          totalLikes: 100,
          totalPosts: 2,
          viewDiff: 10,
          likeDiff: 5,
          postDiff: 1,
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('응답 형식에 맞게 변환된 사용자 리더보드 데이터를 반환해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getUserLeaderboard.mockResolvedValue(mockRawResult);

      const result = await service.getUserLeaderboard('viewCount', 30, 10);

      expect(result.users).toEqual(mockResult.users);
    });

    it('쿼리 파라미터가 올바르게 적용되어야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getUserLeaderboard.mockResolvedValue([]);

      await service.getUserLeaderboard('postCount', 30, 10);

      expect(mockRepo.getUserLeaderboard).toHaveBeenCalledWith('postCount', 30, 10);
    });

    it('쿼리 파라미터가 입력되지 않은 경우 기본값으로 처리되어야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getUserLeaderboard.mockResolvedValue([]);

      await service.getUserLeaderboard();

      expect(mockRepo.getUserLeaderboard).toHaveBeenCalledWith('viewCount', 30, 10);
    });

    it('데이터가 없는 경우 빈 배열을 반환해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getUserLeaderboard.mockResolvedValue([]);

      const result = await service.getUserLeaderboard();

      expect(result).toEqual({ users: [] });
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파한다', async () => {
      const errorMessage = '사용자 리더보드 조회 중 문제가 발생했습니다.';
      const dbError = new DBError(errorMessage);

      mockCache.get.mockResolvedValue(null);
      mockRepo.getUserLeaderboard.mockRejectedValue(dbError);

      await expect(service.getUserLeaderboard()).rejects.toThrow(errorMessage);
      expect(mockRepo.getUserLeaderboard).toHaveBeenCalledTimes(1);
    });

    it('캐시 히트 시 Repository를 호출하지 않고 캐시된 데이터를 반환해야 한다', async () => {
      mockCache.get.mockResolvedValue(mockResult);

      const result = await service.getUserLeaderboard('viewCount', 30, 10);

      expect(mockCache.get).toHaveBeenCalledWith('leaderboard:user:viewCount:30:10');
      expect(mockRepo.getUserLeaderboard).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('캐시 미스 시 Repository를 호출하고 결과를 캐싱해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getUserLeaderboard.mockResolvedValue(mockRawResult);

      const result = await service.getUserLeaderboard('postCount', 30, 10);

      expect(mockRepo.getUserLeaderboard).toHaveBeenCalledWith('postCount', 30, 10);
      expect(mockCache.set).toHaveBeenCalledWith('leaderboard:user:postCount:30:10', mockResult, LEADERBOARD_CACHE_TTL);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPostLeaderboard', () => {
    const mockRawResult = [
      {
        id: '1',
        title: 'test',
        slug: 'test-slug',
        username: 'test',
        total_views: '100',
        total_likes: '50',
        view_diff: '20',
        like_diff: '10',
        released_at: '2025-01-01',
      },
      {
        id: '2',
        title: 'test2',
        slug: 'test2-slug',
        username: 'test2',
        total_views: '200',
        total_likes: '100',
        view_diff: '10',
        like_diff: '5',
        released_at: '2025-01-02',
      },
    ];

    const mockResult = {
      posts: [
        {
          id: '1',
          title: 'test',
          slug: 'test-slug',
          username: 'test',
          totalViews: 100,
          totalLikes: 50,
          viewDiff: 20,
          likeDiff: 10,
          releasedAt: '2025-01-01',
        },
        {
          id: '2',
          title: 'test2',
          slug: 'test2-slug',
          username: 'test2',
          totalViews: 200,
          totalLikes: 100,
          viewDiff: 10,
          likeDiff: 5,
          releasedAt: '2025-01-02',
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('응답 형식에 맞게 변환된 게시물 리더보드 데이터를 반환해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getPostLeaderboard.mockResolvedValue(mockRawResult);

      const result = await service.getPostLeaderboard('viewCount', 30, 10);

      expect(result.posts).toEqual(mockResult.posts);
    });

    it('쿼리 파라미터가 올바르게 적용되어야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getPostLeaderboard.mockResolvedValue([]);

      await service.getPostLeaderboard('likeCount', 30, 10);

      expect(mockRepo.getPostLeaderboard).toHaveBeenCalledWith('likeCount', 30, 10);
    });

    it('쿼리 파라미터가 입력되지 않은 경우 기본값으로 처리되어야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getPostLeaderboard.mockResolvedValue([]);

      await service.getPostLeaderboard();

      expect(mockRepo.getPostLeaderboard).toHaveBeenCalledWith('viewCount', 30, 10);
    });

    it('데이터가 없는 경우 빈 배열을 반환해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getPostLeaderboard.mockResolvedValue([]);

      const result = await service.getPostLeaderboard();

      expect(result).toEqual({ posts: [] });
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파한다', async () => {
      const errorMessage = '게시물 리더보드 조회 중 문제가 발생했습니다.';
      const dbError = new DBError(errorMessage);

      mockCache.get.mockResolvedValue(null);
      mockRepo.getPostLeaderboard.mockRejectedValue(dbError);

      await expect(service.getPostLeaderboard()).rejects.toThrow(errorMessage);
      expect(mockRepo.getPostLeaderboard).toHaveBeenCalledTimes(1);
    });

    it('캐시 히트 시 Repository를 호출하지 않고 캐시된 데이터를 반환해야 한다', async () => {
      mockCache.get.mockResolvedValue(mockResult);

      const result = await service.getPostLeaderboard('viewCount', 30, 10);

      expect(mockCache.get).toHaveBeenCalledWith('leaderboard:post:viewCount:30:10');
      expect(mockRepo.getPostLeaderboard).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('캐시 미스 시 Repository를 호출하고 결과를 캐싱해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepo.getPostLeaderboard.mockResolvedValue(mockRawResult);

      const result = await service.getPostLeaderboard('likeCount', 30, 10);

      expect(mockRepo.getPostLeaderboard).toHaveBeenCalledWith('likeCount', 30, 10);
      expect(mockCache.set).toHaveBeenCalledWith('leaderboard:post:likeCount:30:10', mockResult, LEADERBOARD_CACHE_TTL);
      expect(result).toEqual(mockResult);
    });
  });
});
