import { Pool } from 'pg';
import { DBError, NotFoundError } from '@/exception';
import { LeaderboardRepository } from '@/repositories/leaderboard.repository';

jest.mock('@/types', () => ({
  BadgeDataResponseDto: jest.fn().mockImplementation((user, recentPosts) => ({
    user,
    recentPosts,
  })),
}));
jest.mock('@/repositories/leaderboard.repository');

import { SvgService } from '@/services/svg.service';

describe('SvgService', () => {
  let service: SvgService;
  let mockRepo: jest.Mocked<LeaderboardRepository>;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const mockPoolObj = {};
    mockPool = mockPoolObj as jest.Mocked<Pool>;

    const repoInstance = new LeaderboardRepository(mockPool);
    mockRepo = repoInstance as jest.Mocked<LeaderboardRepository>;

    service = new SvgService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUserStats = {
    username: 'test-user',
    total_views: '1000',
    total_likes: '50',
    total_posts: '10',
    view_diff: '100',
    like_diff: '5',
    post_diff: '2',
  };

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

  describe('getBadgeData', () => {
    it('type이 default일 때 사용자 통계와 최근 게시글을 반환해야 한다', async () => {
      mockRepo.getUserStats.mockResolvedValue(mockUserStats);
      mockRepo.getRecentPosts.mockResolvedValue(mockRecentPosts);

      const result = await service.getBadgeData('test-user', 'default');

      expect(mockRepo.getUserStats).toHaveBeenCalledWith('test-user', 30);
      expect(mockRepo.getRecentPosts).toHaveBeenCalledWith('test-user', 30, 3);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('recentPosts');
      expect(result.user.username).toBe('test-user');
      expect(result.user.totalViews).toBe(1000);
      expect(result.recentPosts).toHaveLength(2);
    });

    it('type이 simple일 때 최근 게시글을 조회하지 않아야 한다', async () => {
      mockRepo.getUserStats.mockResolvedValue(mockUserStats);

      const result = await service.getBadgeData('test-user', 'simple');

      expect(mockRepo.getUserStats).toHaveBeenCalledWith('test-user', 30);
      expect(mockRepo.getRecentPosts).not.toHaveBeenCalled();
      expect(result.recentPosts).toHaveLength(0);
    });

    it('문자열 통계 값을 숫자로 변환해야 한다', async () => {
      mockRepo.getUserStats.mockResolvedValue(mockUserStats);
      mockRepo.getRecentPosts.mockResolvedValue(mockRecentPosts);

      const result = await service.getBadgeData('test-user', 'default');

      expect(typeof result.user.totalViews).toBe('number');
      expect(typeof result.user.totalLikes).toBe('number');
      expect(typeof result.user.totalPosts).toBe('number');
      expect(typeof result.user.viewDiff).toBe('number');
      expect(typeof result.user.likeDiff).toBe('number');
      expect(typeof result.user.postDiff).toBe('number');
    });

    it('최근 게시글 데이터를 올바르게 변환해야 한다', async () => {
      mockRepo.getUserStats.mockResolvedValue(mockUserStats);
      mockRepo.getRecentPosts.mockResolvedValue(mockRecentPosts);

      const result = await service.getBadgeData('test-user', 'default');

      expect(result.recentPosts[0]).toEqual({
        title: 'Test Post 1',
        releasedAt: '2025-01-01',
        viewCount: 100,
        likeCount: 10,
        viewDiff: 20,
      });
    });

    it('dateRange 파라미터가 Repository에 전달되어야 한다', async () => {
      mockRepo.getUserStats.mockResolvedValue(mockUserStats);
      mockRepo.getRecentPosts.mockResolvedValue([]);

      await service.getBadgeData('test-user', 'default', 7);

      expect(mockRepo.getUserStats).toHaveBeenCalledWith('test-user', 7);
      expect(mockRepo.getRecentPosts).toHaveBeenCalledWith('test-user', 7, 3);
    });

    it('Repository에서 NotFoundError 발생 시 그대로 전파해야 한다', async () => {
      mockRepo.getUserStats.mockRejectedValue(new NotFoundError('사용자를 찾을 수 없습니다'));

      await expect(service.getBadgeData('non-existent', 'default')).rejects.toThrow(NotFoundError);
    });

    it('Repository에서 DBError 발생 시 그대로 전파해야 한다', async () => {
      mockRepo.getUserStats.mockRejectedValue(new DBError('DB 오류'));

      await expect(service.getBadgeData('test-user', 'default')).rejects.toThrow(DBError);
    });
  });
});
