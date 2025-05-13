import { PostService } from '@/services/post.service';
import { PostRepository } from '@/repositories/post.repository';
import { DBError } from '@/exception';
import { Pool } from 'pg';

jest.mock('@/repositories/post.repository');

describe('PostService', () => {
  let postService: PostService;
  let postRepo: jest.Mocked<PostRepository>;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // DB Pool 목 설정
    const mockPoolObj = {};
    mockPool = mockPoolObj as jest.Mocked<Pool>;

    // PostRepository 목 설정
    const postRepoInstance = new PostRepository(mockPool);
    postRepo = postRepoInstance as jest.Mocked<PostRepository>;

    // 테스트 대상 서비스 인스턴스 생성
    postService = new PostService(postRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllposts', () => {
    const mockPostsData = {
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

    const expectedTransformedPosts = [
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
    ];

    it('기본 게시물 목록 조회 - 데이터 형식 변환 테스트', async () => {
      // Arrange
      postRepo.findPostsByUserId.mockResolvedValue(mockPostsData);

      // Act
      const result = await postService.getAllposts(1);

      // Assert
      expect(result.posts).toEqual(expectedTransformedPosts);
      expect(result.nextCursor).toBe('2023-11-19T09:19:36.811Z,519212');
      expect(postRepo.findPostsByUserId).toHaveBeenCalledWith(1, undefined, '', undefined, 15);
    });

    it('커서 및 정렬 옵션을 포함한 게시물 목록 조회', async () => {
      // Arrange
      const cursor = 'some-cursor-value';
      const sort = 'dailyViewCount';
      const isAsc = true;
      const limit = 10;

      postRepo.findPostsByUserId.mockResolvedValue(mockPostsData);

      // Act
      const result = await postService.getAllposts(1, cursor, sort, isAsc, limit);

      // Assert
      expect(result.posts).toEqual(expectedTransformedPosts);
      expect(postRepo.findPostsByUserId).toHaveBeenCalledWith(1, cursor, sort, isAsc, limit);
    });

    it('빈 게시물 목록 처리', async () => {
      // Arrange
      const emptyResponse = { posts: [], nextCursor: null };
      postRepo.findPostsByUserId.mockResolvedValue(emptyResponse);

      // Act
      const result = await postService.getAllposts(1);

      // Assert
      expect(result.posts).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파', async () => {
      // Arrange
      const errorMessage = '전체 post 조회 중 문제가 발생했습니다.';
      const dbError = new DBError(errorMessage);
      postRepo.findPostsByUserId.mockRejectedValue(dbError);

      // Act & Assert
      await expect(postService.getAllposts(1)).rejects.toThrow(errorMessage);
      expect(postRepo.findPostsByUserId).toHaveBeenCalledTimes(1);
    });

    it('일부 데이터가 누락된 경우 정상 처리', async () => {
      // Arrange
      const incompleteData = {
        nextCursor: 'cursor-value',
        posts: [
          {
            id: '123',
            title: 'Incomplete Post',
            slug: 'incomplete-post',
            daily_view_count: 100,
            daily_like_count: null, // 누락된 필드 (null)
            yesterday_daily_view_count: undefined, // 누락된 필드 (undefined)
            yesterday_daily_like_count: 0,
            post_created_at: '2025-01-01T00:00:00.000Z',
            post_released_at: '2025-01-01T00:00:00.000Z',
          },
        ],
      };

      postRepo.findPostsByUserId.mockResolvedValue(incompleteData);

      // Act
      const result = await postService.getAllposts(1);

      // Assert
      expect(result.posts[0]).toEqual({
        id: '123',
        title: 'Incomplete Post',
        slug: 'incomplete-post',
        views: 100,
        likes: null, // null 값 그대로 전달
        yesterdayViews: undefined, // undefined 값 그대로 전달
        yesterdayLikes: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
        releasedAt: '2025-01-01T00:00:00.000Z',
      });
    });
  });

  describe('getAllPostStatistics', () => {
    it('게시물 전체 통계 조회 - 문자열을 숫자로 변환', async () => {
      // Arrange
      const mockStatistics = {
        daily_view_count: '355',
        daily_like_count: '3',
        yesterday_views: '355',
        yesterday_likes: '3',
        last_updated_date: '2025-03-14T15:52:40.767Z',
      };

      postRepo.getYesterdayAndTodayViewLikeStats.mockResolvedValue(mockStatistics);

      // Act
      const result = await postService.getAllPostsStatistics(1);

      // Assert
      expect(result).toEqual({
        totalViews: 355,
        totalLikes: 3,
        yesterdayViews: 355,
        yesterdayLikes: 3,
        lastUpdatedDate: '2025-03-14T15:52:40.767Z',
      });
      expect(postRepo.getYesterdayAndTodayViewLikeStats).toHaveBeenCalledWith(1);
    });

    it('숫자 형태의 문자열이 아닌 경우 처리', async () => {
      // Arrange
      const mockStatistics = {
        daily_view_count: 'invalid',
        daily_like_count: '3.5', // 소수점 있는 문자열
        yesterday_views: '355',
        yesterday_likes: '', // 빈 문자열
        last_updated_date: '2025-03-14T15:52:40.767Z',
      };

      postRepo.getYesterdayAndTodayViewLikeStats.mockResolvedValue(mockStatistics);

      // Act
      const result = await postService.getAllPostsStatistics(1);

      // Assert
      expect(result.totalViews).toBe(0); // 'invalid'는 0이 됨
      expect(result.totalLikes).toBe(3); // '3.5'는 parseInt 사용시 3으로 변환
      expect(result.yesterdayViews).toBe(355);
      expect(result.yesterdayLikes).toBe(0); // 빈 문자열은 0으로 변환
    });

    it('누락된 통계 필드에 대한 처리', async () => {
      // Arrange
      const mockStatistics = {
        daily_view_count: '100',
        // daily_like_count missing
        yesterday_views: '90',
        // yesterday_likes missing
        last_updated_date: '2025-03-14T15:52:40.767Z',
      };

      postRepo.getYesterdayAndTodayViewLikeStats.mockResolvedValue(mockStatistics);

      // Act
      const result = await postService.getAllPostsStatistics(1);

      // Assert
      expect(result.totalViews).toBe(100);
      expect(result.totalLikes).toBe(0); // 누락 필드는 0이 됨
      expect(result.yesterdayViews).toBe(90);
      expect(result.yesterdayLikes).toBe(0); // 누락 필드는 0이 됨
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파', async () => {
      // Arrange
      const errorMessage = '통계 조회 중 문제가 발생했습니다.';
      postRepo.getYesterdayAndTodayViewLikeStats.mockRejectedValue(new DBError(errorMessage));

      // Act & Assert
      await expect(postService.getAllPostsStatistics(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('getTotalPostCounts', () => {
    it('게시물 개수 조회', async () => {
      // Arrange
      const mockCount = 42;
      postRepo.getTotalPostCounts.mockResolvedValue(mockCount);

      // Act
      const result = await postService.getTotalPostCounts(1);

      // Assert
      expect(result).toBe(42);
      expect(postRepo.getTotalPostCounts).toHaveBeenCalledWith(1);
    });

    it('0개의 게시물 처리', async () => {
      // Arrange
      postRepo.getTotalPostCounts.mockResolvedValue(0);

      // Act
      const result = await postService.getTotalPostCounts(1);

      // Assert
      expect(result).toBe(0);
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파', async () => {
      // Arrange
      const errorMessage = '총 게시물 수 조회 중 문제가 발생했습니다.';
      postRepo.getTotalPostCounts.mockRejectedValue(new DBError(errorMessage));

      // Act & Assert
      await expect(postService.getTotalPostCounts(1)).rejects.toThrow(errorMessage);
    });
  });

  describe('getPostByPostId', () => {
    const mockPostStats = [
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
    ];

    const expectedTransformedStats = [
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
    ];

    it('시작일과 종료일을 지정하여 상세 통계 조회', async () => {
      const start = '2025-03-01';
      const end = '2025-03-10';

      postRepo.findPostByPostId.mockResolvedValue(mockPostStats);

      const result = await postService.getPostByPostId(1, start, end);
      expect(result).toEqual(expectedTransformedStats);
      expect(postRepo.findPostByPostId).toHaveBeenCalledWith(1, `${start} 00:00:00+09`, `${end} 00:00:00+09`);
    });

    it('빈 통계 목록 처리', async () => {
      postRepo.findPostByPostId.mockResolvedValue([]);

      const result = await postService.getPostByPostId(1);
      expect(result).toEqual([]);
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파', async () => {
      const errorMessage = '게시물 조회 중 문제가 발생했습니다.';
      postRepo.findPostByPostId.mockRejectedValue(new DBError(errorMessage));

      await expect(postService.getPostByPostId(1)).rejects.toThrow(errorMessage);
    });

    it('숫자가 아닌 ID를 전달해도 처리되어야 함', async () => {
      postRepo.findPostByPostId.mockResolvedValue(mockPostStats);
      const result = await postService.getPostByPostId('abc' as unknown as number);
      expect(result).toEqual(expectedTransformedStats);
      // Repository에 ID가 'abc'로 전달됨 (내부적으로 변환하지 않음)
      expect(postRepo.findPostByPostId).toHaveBeenCalledWith('abc', "undefined 00:00:00+09", "undefined 00:00:00+09");
    });
    
  });

  describe('getPostByPostUUID', () => {
    const mockPostStats = [
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
    ];

    const expectedTransformedStats = [
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
    ];

    beforeEach(() => {
      // 테스트용 Date 고정
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('게시물 UUID로 상세 통계 조회 (기본 7일 범위)', async () => {
      postRepo.findPostByPostUUID.mockResolvedValue(mockPostStats);

      const result = await postService.getPostByPostUUID('uuid-1234');

      expect(result).toEqual(expectedTransformedStats);
      // 7일 범위 설정 확인 (현재 날짜 2025-03-15 기준)
      expect(postRepo.findPostByPostUUID).toHaveBeenCalledWith(
        'uuid-1234',
        '2025-03-08 00:00:00+09', // 현재 날짜 (테스트에서 고정된 날짜)
        '2025-03-15 00:00:00+09'  // 현재 날짜 (테스트에서 고정된 날짜)
      );    
    });

    it('빈 통계 목록 처리', async () => {
      postRepo.findPostByPostUUID.mockResolvedValue([]);
      const result = await postService.getPostByPostUUID('uuid-1234');

      expect(result).toEqual([]);
    });

    it('쿼리 오류 발생 시 예외를 그대로 전파', async () => {
      const errorMessage = 'UUID로 게시물 조회 중 문제가 발생했습니다.';
      postRepo.findPostByPostUUID.mockRejectedValue(new DBError(errorMessage));

      await expect(postService.getPostByPostUUID('uuid-1234')).rejects.toThrow(errorMessage);
    });

    it('빈 UUID 처리', async () => {
      // Arrange
      postRepo.findPostByPostUUID.mockResolvedValue([]);

      // Act
      const result = await postService.getPostByPostUUID('');

      // Assert
      expect(result).toEqual([]);
      expect(postRepo.findPostByPostUUID).toHaveBeenCalledWith(
        '', // 빈 문자열 그대로 전달됨
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('transformPosts utility method', () => {
    // private 메소드를 테스트하기 위해 접근법 변경
    it('필드 이름 변환 확인', async () => {
      // Arrange
      const mockPosts = [
        {
          date: '2025-03-08T00:00:00.000Z',
          daily_view_count: 100,
          daily_like_count: 10,
          extra_field: 'should be ignored' // 추가 필드는 무시되어야 함
        }
      ];

      postRepo.findPostByPostId.mockResolvedValue(mockPosts);

      // Act - private 메소드를 직접 호출하지 않고, 공개 메소드를 통해 간접 테스트
      const result = await postService.getPostByPostId(1);

      // Assert
      expect(result).toEqual([
        {
          date: '2025-03-08T00:00:00.000Z',
          dailyViewCount: 100,
          dailyLikeCount: 10
          // extra_field는 변환 후 존재하지 않아야 함
        }
      ]);
      // result에 extra_field 속성이 없는지 확인
      expect(result[0]).not.toHaveProperty('extra_field');
    });

    it('null 또는 undefined 값이 있는 경우 처리', async () => {
      // Arrange
      const mockPosts = [
        {
          date: '2025-03-08T00:00:00.000Z',
          daily_view_count: null,
          daily_like_count: undefined
        }
      ];

      postRepo.findPostByPostId.mockResolvedValue(mockPosts);

      // Act
      const result = await postService.getPostByPostId(1);

      // Assert
      expect(result).toEqual([
        {
          date: '2025-03-08T00:00:00.000Z',
          dailyViewCount: null,
          dailyLikeCount: undefined
        }
      ]);
    });
  });
});