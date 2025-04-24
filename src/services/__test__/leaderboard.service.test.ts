import { Pool } from 'pg';
import { DBError } from '@/exception';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { LeaderboardService } from '@/services/leaderboard.service';

jest.mock('@/repositories/leaderboard.repository');

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let repo: jest.Mocked<LeaderboardRepository>;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const mockPoolObj = {};
    mockPool = mockPoolObj as jest.Mocked<Pool>;

    const repoInstance = new LeaderboardRepository(mockPool);
    repo = repoInstance as jest.Mocked<LeaderboardRepository>;

    service = new LeaderboardService(repo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserLeaderboard', () => {
    it('응답 형식에 맞게 변환된 사용자 리더보드 데이터를 반환해야 한다', async () => {
      const mockRawResult = [
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

      const mockResult = {
        posts: null,
        users: [
          {
            id: 1,
            email: 'test@test.com',
            totalViews: 100,
            totalLikes: 50,
            totalPosts: 1,
            viewDiff: 20,
            likeDiff: 10,
            postDiff: 1,
          },
          {
            id: 2,
            email: 'test2@test.com',
            totalViews: 200,
            totalLikes: 100,
            totalPosts: 2,
            viewDiff: 10,
            likeDiff: 5,
            postDiff: 1,
          },
        ],
      };

      repo.getUserLeaderboard.mockResolvedValue(mockRawResult);
      const result = await service.getUserLeaderboard();

      expect(result.users).toEqual(mockResult.users);
    });

    it('쿼리 파라미터가 입력되지 않은 경우 기본값으로 처리되어야 한다', async () => {
      repo.getUserLeaderboard.mockResolvedValue([]);
      await service.getUserLeaderboard();

      expect(repo.getUserLeaderboard).toHaveBeenCalledWith('viewCount', 30, 10);
    });

    it('데이터가 없는 경우 빈 배열을 반환해야 한다', async () => {
      repo.getUserLeaderboard.mockResolvedValue([]);
      const result = await service.getUserLeaderboard();

      expect(result).toEqual({ users: [] });
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파한다', async () => {
      const errorMessage = '사용자 리더보드 조회 중 문제가 발생했습니다.';
      const dbError = new DBError(errorMessage);
      repo.getUserLeaderboard.mockRejectedValue(dbError);

      await expect(service.getUserLeaderboard()).rejects.toThrow(errorMessage);
      expect(repo.getUserLeaderboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPostLeaderboard', () => {
    it('응답 형식에 맞게 변환된 게시물 리더보드 데이터를 반환해야 한다', async () => {
      const mockRawResult = [
        {
          id: 1,
          title: 'test',
          slug: 'test-slug',
          total_views: 100,
          total_likes: 50,
          view_diff: 20,
          like_diff: 10,
          released_at: '2025-01-01',
        },
        {
          id: 2,
          title: 'test2',
          slug: 'test2-slug',
          total_views: 200,
          total_likes: 100,
          view_diff: 10,
          like_diff: 5,
          released_at: '2025-01-02',
        },
      ];

      const mockResult = {
        posts: [
          {
            id: 1,
            title: 'test',
            slug: 'test-slug',
            totalViews: 100,
            totalLikes: 50,
            viewDiff: 20,
            likeDiff: 10,
            releasedAt: '2025-01-01',
          },
          {
            id: 2,
            title: 'test2',
            slug: 'test2-slug',
            totalViews: 200,
            totalLikes: 100,
            viewDiff: 10,
            likeDiff: 5,
            releasedAt: '2025-01-02',
          },
        ],
        users: null,
      };

      repo.getPostLeaderboard.mockResolvedValue(mockRawResult);
      const result = await service.getPostLeaderboard();

      expect(result.posts).toEqual(mockResult.posts);
    });

    it('쿼리 파라미터가 입력되지 않은 경우 기본값으로 처리되어야 한다', async () => {
      repo.getPostLeaderboard.mockResolvedValue([]);
      await service.getPostLeaderboard();

      expect(repo.getPostLeaderboard).toHaveBeenCalledWith('viewCount', 30, 10);
    });

    it('데이터가 없는 경우 빈 배열을 반환해야 한다', async () => {
      repo.getPostLeaderboard.mockResolvedValue([]);
      const result = await service.getPostLeaderboard();

      expect(result).toEqual({ posts: [] });
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파한다', async () => {
      const errorMessage = '게시물 리더보드 조회 중 문제가 발생했습니다.';
      const dbError = new DBError(errorMessage);
      repo.getPostLeaderboard.mockRejectedValue(dbError);

      await expect(service.getPostLeaderboard()).rejects.toThrow(errorMessage);
      expect(repo.getPostLeaderboard).toHaveBeenCalledTimes(1);
    });
  });
});
