import { Pool } from 'pg';
import { DBError } from '@/exception';
import { TotalStatsType } from '@/types';
import { TotalStatsRepository } from '@/repositories/totalStats.repository';
import { getKSTDateStringWithOffset } from '@/utils/date.util';
import { mockPool, createMockQueryResult } from '@/utils/fixtures';

// Mock dependencies
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
}));

jest.mock('@/utils/date.util', () => ({
  getKSTDateStringWithOffset: jest.fn(),
}));

describe('TotalStatsRepository', () => {
  let repository: TotalStatsRepository;
  let mockGetKSTDateStringWithOffset: jest.MockedFunction<typeof getKSTDateStringWithOffset>;

  beforeEach(() => {
    mockGetKSTDateStringWithOffset = getKSTDateStringWithOffset as jest.MockedFunction<typeof getKSTDateStringWithOffset>;

    repository = new TotalStatsRepository(mockPool as unknown as Pool);
    jest.clearAllMocks();
  });

  describe('getTotalStats', () => {
    const userId = 1;
    const period = 7;
    const mockStartDate = '2025-05-27';

    beforeEach(() => {
      mockGetKSTDateStringWithOffset.mockReturnValue(mockStartDate);
    });

    describe('view 타입 통계 조회', () => {
      it('조회수 통계를 성공적으로 조회해야 한다', async () => {
        // Given
        const mockViewStats = [
          { date: '2025-05-27', total_value: '100' },
          { date: '2025-05-28', total_value: '150' },
          { date: '2025-05-29', total_value: '200' },
        ];

        mockPool.query.mockResolvedValue(createMockQueryResult(mockViewStats));

        // When
        const result = await repository.getTotalStats(userId, period, 'view');

        // Then
        expect(result).toEqual(mockViewStats);
        expect(mockGetKSTDateStringWithOffset).toHaveBeenCalledWith(-period * 24 * 60);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SUM(pds.daily_view_count)'),
          [userId, mockStartDate]
        );
      });

      it('조회수 통계 조회 시 DB 에러가 발생하면 DBError를 던져야 한다', async () => {
        // Given
        mockPool.query.mockRejectedValue(new Error('Database connection failed'));

        // When & Then
        await expect(repository.getTotalStats(userId, period, 'view')).rejects.toThrow(
          new DBError('조회수 통계 조회 중 문제가 발생했습니다.')
        );
      });
    });

    describe('like 타입 통계 조회', () => {
      it('좋아요 통계를 성공적으로 조회해야 한다', async () => {
        // Given
        const mockLikeStats = [
          { date: '2025-05-27', total_value: '50' },
          { date: '2025-05-28', total_value: '75' },
          { date: '2025-05-29', total_value: '100' },
        ];

        mockPool.query.mockResolvedValue(createMockQueryResult(mockLikeStats));

        // When
        const result = await repository.getTotalStats(userId, period, 'like');

        // Then
        expect(result).toEqual(mockLikeStats);
        expect(mockGetKSTDateStringWithOffset).toHaveBeenCalledWith(-period * 24 * 60);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SUM(pds.daily_like_count)'),
          [userId, mockStartDate]
        );
      });

      it('좋아요 통계 조회 시 DB 에러가 발생하면 DBError를 던져야 한다', async () => {
        // Given
        mockPool.query.mockRejectedValue(new Error('Database connection failed'));

        // When & Then
        await expect(repository.getTotalStats(userId, period, 'like')).rejects.toThrow(
          new DBError('좋아요 통계 조회 중 문제가 발생했습니다.')
        );
      });
    });

    describe('post 타입 통계 조회', () => {
      it('게시글 통계를 성공적으로 조회해야 한다', async () => {
        // Given
        const mockPostStats = [
          { date: '2025-05-27', total_value: 5 },
          { date: '2025-05-28', total_value: 7 },
          { date: '2025-05-29', total_value: 10 },
        ];

        mockPool.query.mockResolvedValue(createMockQueryResult(mockPostStats));

        // When
        const result = await repository.getTotalStats(userId, period, 'post');

        // Then
        expect(result).toEqual(mockPostStats);
        expect(mockGetKSTDateStringWithOffset).toHaveBeenCalledWith(-period * 24 * 60);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('WITH date_series AS'),
          [userId, mockStartDate]
        );
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT COUNT(id)'),
          [userId, mockStartDate]
        );
      });

      it('게시글 통계 조회 시 DB 에러가 발생하면 DBError를 던져야 한다', async () => {
        // Given
        mockPool.query.mockRejectedValue(new Error('Database connection failed'));

        // When & Then
        await expect(repository.getTotalStats(userId, period, 'post')).rejects.toThrow(
          new DBError('게시글 통계 조회 중 문제가 발생했습니다.')
        );
      });
    });

    describe('잘못된 타입 처리', () => {
      it('지원되지 않는 통계 타입이 전달되면 DBError를 던져야 한다', async () => {
        // When & Then
        await expect(
          repository.getTotalStats(userId, period, 'invalid' as unknown as TotalStatsType)
        ).rejects.toThrow(new DBError('지원되지 않는 통계 타입입니다.'));

        expect(mockPool.query).not.toHaveBeenCalled();
      });
    });

    describe('다양한 기간 테스트', () => {
      it('30일 기간으로 통계를 조회할 수 있어야 한다', async () => {
        // Given
        const period30 = 30;
        const mockStats = [{ date: '2025-04-27', total_value: '1000' }];

        mockPool.query.mockResolvedValue(createMockQueryResult(mockStats));

        // When
        await repository.getTotalStats(userId, period30, 'view');

        // Then
        expect(mockGetKSTDateStringWithOffset).toHaveBeenCalledWith(-period30 * 24 * 60);
      });
    });

    describe('빈 결과 처리', () => {
      it('데이터가 없을 때 빈 배열을 반환해야 한다', async () => {
        // Given
        mockPool.query.mockResolvedValue(createMockQueryResult([]));

        // When
        const result = await repository.getTotalStats(userId, period, 'view');

        // Then
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('SQL 쿼리 검증', () => {
      beforeEach(() => {
        mockPool.query.mockResolvedValue(createMockQueryResult([]));
      });

      it('view 통계 쿼리가 올바른 테이블과 조건을 포함해야 한다', async () => {
        // When
        await repository.getTotalStats(userId, period, 'view');

        // Then
        const calledQuery = mockPool.query.mock.calls[0][0] as string;
        expect(calledQuery).toContain('posts_postdailystatistics pds');
        expect(calledQuery).toContain('JOIN posts_post p ON p.id = pds.post_id');
        expect(calledQuery).toContain('p.user_id = $1');
        expect(calledQuery).toContain('p.is_active = true');
        expect(calledQuery).toContain('pds.date >= $2');
        expect(calledQuery).toContain('SUM(pds.daily_view_count)');
      });

      it('like 통계 쿼리가 올바른 컬럼을 조회해야 한다', async () => {
        // When
        await repository.getTotalStats(userId, period, 'like');

        // Then
        const calledQuery = mockPool.query.mock.calls[0][0] as string;
        expect(calledQuery).toContain('SUM(pds.daily_like_count)');
      });

      it('post 통계 쿼리가 CTE와 윈도우 함수를 사용해야 한다', async () => {
        // When
        await repository.getTotalStats(userId, period, 'post');

        // Then
        const calledQuery = mockPool.query.mock.calls[0][0] as string;
        expect(calledQuery).toContain('WITH date_series AS');
        expect(calledQuery).toContain('generate_series');
      });
    });
  });
});