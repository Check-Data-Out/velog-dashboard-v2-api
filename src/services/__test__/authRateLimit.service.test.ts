import { AuthRateLimitService } from '../authRateLimit.service';
import { ICache } from '@/modules/cache/cache.type';
import logger from '@/configs/logger.config';

jest.mock('@/configs/logger.config', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('AuthRateLimitService', () => {
  let authRateLimitService: AuthRateLimitService;
  let mockCache: jest.Mocked<ICache>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      clear: jest.fn(),
      size: jest.fn(),
      connect: jest.fn(),
      destroy: jest.fn(),
      isConnected: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('ICache를 생성자 인자로 받아야 한다', () => {
      authRateLimitService = new AuthRateLimitService(mockCache);
      expect(authRateLimitService).toBeInstanceOf(AuthRateLimitService);
    });
  });

  describe('trackAuthFailure', () => {
    beforeEach(() => {
      authRateLimitService = new AuthRateLimitService(mockCache);
    });

    it('첫 번째 실패를 count: 1로 기록해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      await authRateLimitService.trackAuthFailure('192.168.1.1');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1'),
        expect.objectContaining({ count: 1 }),
        expect.any(Number),
      );
    });

    it('기존 실패 기록에 count를 누적해야 한다', async () => {
      const existingRecord = { count: 3, firstFailure: Date.now() - 60000 };
      mockCache.get.mockResolvedValue(existingRecord);
      mockCache.set.mockResolvedValue(undefined);

      await authRateLimitService.trackAuthFailure('192.168.1.1');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1'),
        expect.objectContaining({ count: 4 }),
        expect.any(Number),
      );
    });

    it('윈도우 시간이 지난 기록은 count: 1로 초기화해야 한다', async () => {
      // 윈도우 시간(5분 = 300초)이 지난 기록
      const oldRecord = { count: 5, firstFailure: Date.now() - 6 * 60 * 1000 };
      mockCache.get.mockResolvedValue(oldRecord);
      mockCache.set.mockResolvedValue(undefined);

      await authRateLimitService.trackAuthFailure('192.168.1.1');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1'),
        expect.objectContaining({ count: 1 }),
        expect.any(Number),
      );
    });

    it('TTL을 설정하여 캐시에 저장해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      await authRateLimitService.trackAuthFailure('192.168.1.1');

      // TTL이 15분(900초)으로 설정되어야 함
      expect(mockCache.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 900);
    });

    it('임계값 도달 시 logger.warn을 호출해야 한다', async () => {
      // 임계값(5) - 1 = 4회 실패 기록이 있는 상태
      const existingRecord = { count: 4, firstFailure: Date.now() - 60000 };
      mockCache.get.mockResolvedValue(existingRecord);
      mockCache.set.mockResolvedValue(undefined);

      await authRateLimitService.trackAuthFailure('192.168.1.1');

      // 5회째 실패 시 경고 로그
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('brute force'),
        expect.objectContaining({ ip: '192.168.1.1' }),
      );
    });

    it('캐시 에러 발생 시 예외를 던지지 않아야 한다 (fail-open)', async () => {
      mockCache.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(authRateLimitService.trackAuthFailure('192.168.1.1')).resolves.not.toThrow();
    });
  });

  describe('isIpBlocked', () => {
    beforeEach(() => {
      authRateLimitService = new AuthRateLimitService(mockCache);
    });

    it('실패 횟수가 임계값 이상이면 true를 반환해야 한다', async () => {
      // 임계값(5) 이상인 기록
      const blockedRecord = { count: 5, firstFailure: Date.now() - 60000 };
      mockCache.get.mockResolvedValue(blockedRecord);

      const result = await authRateLimitService.isIpBlocked('192.168.1.1');

      expect(result).toBe(true);
    });

    it('실패 횟수가 임계값 미만이면 false를 반환해야 한다', async () => {
      // 임계값(5) 미만인 기록
      const notBlockedRecord = { count: 4, firstFailure: Date.now() - 60000 };
      mockCache.get.mockResolvedValue(notBlockedRecord);

      const result = await authRateLimitService.isIpBlocked('192.168.1.1');

      expect(result).toBe(false);
    });

    it('기록이 없으면 false를 반환해야 한다', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await authRateLimitService.isIpBlocked('192.168.1.1');

      expect(result).toBe(false);
    });

    it('캐시 에러 시 false를 반환해야 한다 (fail-open)', async () => {
      mockCache.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await authRateLimitService.isIpBlocked('192.168.1.1');

      expect(result).toBe(false);
    });
  });

  describe('clearFailures', () => {
    beforeEach(() => {
      authRateLimitService = new AuthRateLimitService(mockCache);
    });

    it('특정 IP의 실패 기록을 삭제해야 한다', async () => {
      mockCache.delete.mockResolvedValue(true);

      await authRateLimitService.clearFailures('192.168.1.1');

      expect(mockCache.delete).toHaveBeenCalledWith(expect.stringContaining('192.168.1.1'));
    });

    it('캐시 에러 발생 시 예외를 던지지 않아야 한다', async () => {
      mockCache.delete.mockRejectedValue(new Error('Redis connection failed'));

      await expect(authRateLimitService.clearFailures('192.168.1.1')).resolves.not.toThrow();
    });
  });
});
