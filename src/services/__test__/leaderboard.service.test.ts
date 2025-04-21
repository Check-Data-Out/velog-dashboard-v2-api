import { DBError } from '@/exception';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';
import { LeaderboardService } from '@/services/leaderboard.service';
import { Pool } from 'pg';

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

  describe('getLeaderboard', () => {
    it('type이 user인 경우 posts는 null이고, users는 응답 형식에 맞게 변환되어야 한다', async () => {
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

      repo.getLeaderboard.mockResolvedValue(mockRawResult);

      const result = await service.getLeaderboard('user');

      expect(result.posts).toBeNull();
      expect(result.users).toEqual(mockResult.users);
    });

    it('type이 post인 경우 users는 null이고, posts는 응답 형식에 맞게 변환되어야 한다', async () => {
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

      repo.getLeaderboard.mockResolvedValue(mockRawResult);

      const result = await service.getLeaderboard('post');

      expect(result.users).toBeNull();
      expect(result.posts).toEqual(mockResult.posts);
    });

    it('쿼리 파라미터가 입력되지 않은 경우 기본값으로 처리되어야 한다', async () => {
      repo.getLeaderboard.mockResolvedValue([]);
      await service.getLeaderboard();

      expect(repo.getLeaderboard).toHaveBeenCalledWith('user', 'viewCount', 30, 10);
    });

    it('데이터가 없는 경우 빈 배열을 반환해야 한다', async () => {
      repo.getLeaderboard.mockResolvedValue([]);
      const result = await service.getLeaderboard();

      expect(result).toEqual({ users: [], posts: null });
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파한다', async () => {
      const errorMessage = '유저 리더보드 조회 중 문제가 발생했습니다.';
      const dbError = new DBError(errorMessage);
      repo.getLeaderboard.mockRejectedValue(dbError);

      await expect(service.getLeaderboard()).rejects.toThrow(errorMessage);
      expect(repo.getLeaderboard).toHaveBeenCalledTimes(1);
    });
  });
});
