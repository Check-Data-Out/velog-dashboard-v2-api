import { PostService } from '@/services/post.service';
import { PostRepository } from '@/repositories/post.repository';
import { DBError } from '@/exception';

jest.mock('@/repositories/post.repository');

// 모든 파라미터는 Route 단에서 검증하기 때문에 파라미터를 제대로 받았는지는 확인하지 않음
describe('PostService', () => {
  let postService: PostService;
  let postRepo: jest.Mocked<PostRepository>;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {};

    postRepo = new PostRepository(mockPool) as jest.Mocked<PostRepository>;
    postService = new PostService(postRepo);
  });

  describe('getAllposts', () => {
    it('게시물 목록 조회', async () => {
      const mockPosts = {
        nextCursor: '2023-11-19T09:19:36.811Z,519212',
        posts: [
          {
            id: '519211',
            title: 'velog dashboard test post (2)',
            slug: 'velog-dashboard-test-post-2',
            daily_view_count: 147,
            daily_like_count: 2,
            yesterday_daily_view_count: 147,
            yesterday_daily_like_count: 2,
            post_created_at: '2025-02-08T02:58:24.347Z',
            post_released_at: '2023-11-20T02:15:14.209Z',
          },
          {
            id: '519212',
            title: 'velog dashboard test post (1)',
            slug: 'velog-dashboard-test-post-1',
            daily_view_count: 208,
            daily_like_count: 1,
            yesterday_daily_view_count: 208,
            yesterday_daily_like_count: 1,
            post_created_at: '2025-02-08T02:58:24.347Z',
            post_released_at: '2023-11-19T09:19:36.811Z',
          },
        ],
      };

      postRepo.findPostsByUserId.mockResolvedValue(mockPosts);

      const result = await postService.getAllposts(1);
      console.log(result);
      expect(result.posts).toEqual([
        {
          id: '519211',
          title: 'velog dashboard test post (2)',
          slug: 'velog-dashboard-test-post-2',
          views: 147,
          likes: 2,
          yesterdayViews: 147,
          yesterdayLikes: 2,
          createdAt: '2025-02-08T02:58:24.347Z',
          releasedAt: '2023-11-20T02:15:14.209Z',
        },
        {
          id: '519212',
          title: 'velog dashboard test post (1)',
          slug: 'velog-dashboard-test-post-1',
          views: 208,
          likes: 1,
          yesterdayViews: 208,
          yesterdayLikes: 1,
          createdAt: '2025-02-08T02:58:24.347Z',
          releasedAt: '2023-11-19T09:19:36.811Z',
        },
      ]);
      expect(result.nextCursor).toBe('2023-11-19T09:19:36.811Z,519212');
    });

    it('쿼리 중 오류 발생 시 DBError Throw', async () => {
      const errorMessage = '전체 post 조회 중 문제가 발생했습니다.';
      postRepo.findPostsByUserId.mockRejectedValue(new DBError(errorMessage));

      await expect(postService.getAllposts(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('getAllPostStatistics', () => {
    it('게시물 전체 통계 조회', async () => {
      const mockStatistics = {
        daily_view_count: '355',
        daily_like_count: '3',
        yesterday_views: '355',
        yesterday_likes: '3',
        last_updated_date: '2025-03-14T15:52:40.767Z',
      };

      postRepo.getYesterdayAndTodayViewLikeStats.mockResolvedValue(mockStatistics);

      const result = await postService.getAllPostStatistics(1);

      expect(result).toEqual({
        totalViews: 355,
        totalLikes: 3,
        yesterdayViews: 355,
        yesterdayLikes: 3,
        lastUpdatedDate: '2025-03-14T15:52:40.767Z',
      });
    });

    it('쿼리 중 오류 발생 시 DBError Throw', async () => {
      const errorMessage = '통계 조회 중 문제가 발생했습니다.';
      postRepo.getYesterdayAndTodayViewLikeStats.mockRejectedValue(new DBError(errorMessage));

      await expect(postService.getAllPostStatistics(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('getTotalPostCounts', () => {
    it('게시물 개수 조회', async () => {
      const mockCount = 2;
      postRepo.getTotalPostCounts.mockResolvedValue(mockCount);

      const result = await postService.getTotalPostCounts(1);

      expect(result).toBe(mockCount);
    });

    it('쿼리 중 오류 발생 시 DBError Throw', async () => {
      const errorMessage = '총 게시물 수 조회 중 문제가 발생했습니다.';
      postRepo.getTotalPostCounts.mockRejectedValue(new DBError(errorMessage));

      await expect(postService.getTotalPostCounts(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('getPostByPostId', () => {
    it('게시물 상세 통계 조회', async () => {
      const mockPosts = [
        {
          date: '2025-03-08T00:00:00.000Z',
          daily_view_count: 145,
          daily_like_count: 2,
        },
        {
          date: '2025-03-09T00:00:00.000Z',
          daily_view_count: 145,
          daily_like_count: 2,
        },
        {
          date: '2025-03-10T00:00:00.000Z',
          daily_view_count: 147,
          daily_like_count: 2,
        },
        {
          date: '2025-03-11T00:00:00.000Z',
          daily_view_count: 147,
          daily_like_count: 2,
        },
      ];

      postRepo.findPostByPostId.mockResolvedValue(mockPosts);

      const result = await postService.getPostByPostId(1);

      expect(result).toEqual([
        {
          date: '2025-03-08T00:00:00.000Z',
          dailyViewCount: 145,
          dailyLikeCount: 2,
        },
        {
          date: '2025-03-09T00:00:00.000Z',
          dailyViewCount: 145,
          dailyLikeCount: 2,
        },
        {
          date: '2025-03-10T00:00:00.000Z',
          dailyViewCount: 147,
          dailyLikeCount: 2,
        },
        {
          date: '2025-03-11T00:00:00.000Z',
          dailyViewCount: 147,
          dailyLikeCount: 2,
        },
      ]);
    });

    it('쿼리 중 오류 발생 시 DBError Throw', async () => {
      const errorMessage = '게시물 조회 중 문제가 발생했습니다.';
      postRepo.findPostByPostId.mockRejectedValue(new DBError(errorMessage));

      await expect(postService.getPostByPostId(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('getPostByPostUUID', () => {
    it('게시물 상세 통계 조회', async () => {
      const mockPosts = [
        {
          date: '2025-03-08T00:00:00.000Z',
          daily_view_count: 145,
          daily_like_count: 2,
        },
        {
          date: '2025-03-09T00:00:00.000Z',
          daily_view_count: 145,
          daily_like_count: 2,
        },
        {
          date: '2025-03-10T00:00:00.000Z',
          daily_view_count: 147,
          daily_like_count: 2,
        },
        {
          date: '2025-03-11T00:00:00.000Z',
          daily_view_count: 147,
          daily_like_count: 2,
        },
      ];

      postRepo.findPostByPostUUID.mockResolvedValue(mockPosts);

      const result = await postService.getPostByPostUUID('uuid-1234');

      expect(result).toEqual([
        {
          date: '2025-03-08T00:00:00.000Z',
          dailyViewCount: 145,
          dailyLikeCount: 2,
        },
        {
          date: '2025-03-09T00:00:00.000Z',
          dailyViewCount: 145,
          dailyLikeCount: 2,
        },
        {
          date: '2025-03-10T00:00:00.000Z',
          dailyViewCount: 147,
          dailyLikeCount: 2,
        },
        {
          date: '2025-03-11T00:00:00.000Z',
          dailyViewCount: 147,
          dailyLikeCount: 2,
        },
      ]);
    });

    it('쿼리 중 오류 발생 시 DBError Throw', async () => {
      const errorMessage = 'UUID로 게시물 조회 중 문제가 발생했습니다.';
      postRepo.findPostByPostUUID.mockRejectedValue(new DBError(errorMessage));

      await expect(postService.getPostByPostUUID('uuid-1234')).rejects.toThrow(errorMessage);
    });
  });
});
