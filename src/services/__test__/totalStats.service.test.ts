import { TotalStatsRepository } from '@/repositories/totalStats.repository';
import { TotalStatsService } from '@/services/totalStats.service';
import { RedisCache } from '@/modules/cache/redis.cache';
import { Pool } from 'pg';

jest.mock('@/repositories/totalStats.repository');
jest.mock('@/configs/cache.config', () => ({
  cache: {
    isUserInQueue: jest.fn(),
    pushToQueue: jest.fn(),
  },
}));
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
}));

describe('TotalStatsService', () => {
  let service: TotalStatsService;
  let mockRepo: jest.Mocked<TotalStatsRepository>;
  let mockCache: jest.Mocked<RedisCache>;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const mockPoolObj = {};
    mockPool = mockPoolObj as jest.Mocked<Pool>;
    mockRepo = new TotalStatsRepository(mockPool) as jest.Mocked<TotalStatsRepository>;

    const { cache } = jest.requireMock('@/configs/cache.config');
    mockCache = cache as jest.Mocked<RedisCache>;

    service = new TotalStatsService(mockRepo);
    jest.clearAllMocks();
  });

  describe('refreshStats', () => {
    const userId = 1;
    const now = new Date('2025-12-24T12:00:00.000Z');
    const fifteenMinutesAgo = new Date('2025-12-24T11:45:00.000Z');
    const sixteenMinutesAgo = new Date('2025-12-24T11:44:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('성공적으로 직접 새로고침 대기열에 추가해야 한다', async () => {
      mockRepo.getLatestUpdatedAt.mockResolvedValue(sixteenMinutesAgo.toISOString());
      mockCache.isUserInQueue.mockResolvedValue(false);
      mockCache.pushToQueue.mockResolvedValue(1);

      const result = await service.refreshStats(userId);

      expect(result).toEqual({ success: true });
      expect(mockCache.isUserInQueue).toHaveBeenCalledWith('stats-refresh:processing', userId);
      expect(mockCache.pushToQueue).toHaveBeenCalledWith('stats-refresh', {
        userId,
        requestedAt: now.toISOString(),
        retryCount: 0,
      });
    });

    it('최근 업데이트 기록이 없는 경우 성공적으로 대기열에 추가해야 한다', async () => {
      mockRepo.getLatestUpdatedAt.mockResolvedValue(null);
      mockCache.isUserInQueue.mockResolvedValue(false);
      mockCache.pushToQueue.mockResolvedValue(1);

      const result = await service.refreshStats(userId);

      expect(result).toEqual({ success: true });
      expect(mockCache.pushToQueue).toHaveBeenCalledWith('stats-refresh', {
        userId,
        requestedAt: now.toISOString(),
        retryCount: 0,
      });
    });

    it('15분 이내에 업데이트된 경우 up-to-date 응답을 반환해야 한다', async () => {
      mockRepo.getLatestUpdatedAt.mockResolvedValue(fifteenMinutesAgo.toISOString());

      const result = await service.refreshStats(userId);

      expect(result).toEqual({
        success: false,
        reason: 'up-to-date',
        lastUpdatedAt: fifteenMinutesAgo.toISOString(),
      });
      expect(mockCache.isUserInQueue).not.toHaveBeenCalled();
      expect(mockCache.pushToQueue).not.toHaveBeenCalled();
    });

    it('이미 processing queue에 있는 경우 in-progress 응답을 반환해야 한다', async () => {
      mockRepo.getLatestUpdatedAt.mockResolvedValue(sixteenMinutesAgo.toISOString());
      mockCache.isUserInQueue.mockResolvedValue(true);

      const result = await service.refreshStats(userId);

      expect(result).toEqual({
        success: false,
        reason: 'in-progress',
      });
      expect(mockCache.isUserInQueue).toHaveBeenCalledWith('stats-refresh:processing', userId);
      expect(mockCache.pushToQueue).not.toHaveBeenCalled();
    });

    it('큐 추가 실패 시 에러를 던져야 한다', async () => {
      mockRepo.getLatestUpdatedAt.mockResolvedValue(sixteenMinutesAgo.toISOString());
      mockCache.isUserInQueue.mockResolvedValue(false);
      mockCache.pushToQueue.mockResolvedValue(null);

      await expect(service.refreshStats(userId)).rejects.toThrow('통계 새로고침 작업 등록에 실패했습니다.');
      expect(mockCache.pushToQueue).toHaveBeenCalled();
    });

    it('리포지토리 에러 발생 시 에러를 전파해야 한다', async () => {
      const dbError = new Error('Database error');
      mockRepo.getLatestUpdatedAt.mockRejectedValue(dbError);

      await expect(service.refreshStats(userId)).rejects.toThrow(dbError);
      expect(mockCache.isUserInQueue).not.toHaveBeenCalled();
      expect(mockCache.pushToQueue).not.toHaveBeenCalled();
    });

    it('캐시 에러 발생 시 에러를 전파해야 한다', async () => {
      mockRepo.getLatestUpdatedAt.mockResolvedValue(sixteenMinutesAgo.toISOString());
      const cacheError = new Error('Redis connection failed');
      mockCache.isUserInQueue.mockRejectedValue(cacheError);

      await expect(service.refreshStats(userId)).rejects.toThrow(cacheError);
    });
  });
});
