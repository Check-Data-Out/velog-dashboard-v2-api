import { RedisCache } from '@/modules/cache/redis.cache';
import { CacheConfig } from '@/modules/cache/cache.type';
import { createClient } from 'redis';

// Redis 클라이언트 타입 정의
interface MockRedisClient {
  connect: jest.Mock;
  destroy: jest.Mock;
  on: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  setEx: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  keys: jest.Mock;
  scan: jest.Mock;
}

// Redis 모킹
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

// logger 모킹
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('RedisCache', () => {
  let redisCache: RedisCache;
  let mockClient: MockRedisClient;
  let config: CacheConfig;
  let mockCreateClient: jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    // Redis 클라이언트 모킹 설정
    mockClient = {
      connect: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      scan: jest.fn(),
    };

    mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
    mockCreateClient.mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);

    // 테스트용 설정
    config = {
      host: 'localhost',
      port: 6379,
      password: 'test-password',
      db: 0,
      keyPrefix: 'test:cache:',
      defaultTTL: 300,
    };

    redisCache = new RedisCache(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('설정값을 올바르게 초기화해야 한다', () => {
      expect(mockCreateClient).toHaveBeenCalledWith({
        socket: {
          host: 'localhost',
          port: 6379,
        },
        password: 'test-password',
        database: 0,
      });
    });

    it('기본값으로 설정을 초기화해야 한다', () => {
      const minimalConfig: CacheConfig = {
        host: 'localhost',
        port: 6379,
      };

      new RedisCache(minimalConfig);

      // 생성자에서 이벤트 핸들러 설정이 호출되는지 확인
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('destroy', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('연결되지 않은 상태에서 연결에 성공해야 한다', async () => {
      mockClient.connect.mockResolvedValue(undefined);

      await redisCache.connect();

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(redisCache.isConnected()).toBe(true);
    });

    it('이미 연결된 상태에서는 재연결하지 않아야 한다', async () => {
      // 먼저 연결
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();

      // 두 번째 연결 시도
      await redisCache.connect();

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('연결 실패 시 에러를 던져야 한다', async () => {
      const connectionError = new Error('Connection failed');
      mockClient.connect.mockRejectedValue(connectionError);

      await expect(redisCache.connect()).rejects.toThrow('Connection failed');
      expect(redisCache.isConnected()).toBe(false);
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      // 연결 상태로 만들기
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();
    });

    it('연결된 상태에서 연결 해제에 성공해야 한다', async () => {
      mockClient.destroy.mockResolvedValue(undefined);

      await redisCache.destroy();

      expect(mockClient.destroy).toHaveBeenCalledTimes(1);
      expect(redisCache.isConnected()).toBe(false);
    });

    it('연결되지 않은 상태에서는 연결 해제하지 않아야 한다', async () => {
      // 먼저 연결 해제
      mockClient.destroy.mockResolvedValue(undefined);
      await redisCache.destroy();

      // 두 번째 연결 해제 시도
      await redisCache.destroy();

      expect(mockClient.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();
    });

    it('존재하는 키의 값을 성공적으로 가져와야 한다', async () => {
      const testData = { name: 'test', value: 123 };
      mockClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await redisCache.get('test-key');

      expect(mockClient.get).toHaveBeenCalledWith('test:cache:test-key');
      expect(result).toEqual(testData);
    });

    it('존재하지 않는 키에 대해 null을 반환해야 한다', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await redisCache.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('연결되지 않은 상태에서 null을 반환해야 한다', async () => {
      // 연결 해제
      mockClient.destroy.mockResolvedValue(undefined);
      await redisCache.destroy();

      const result = await redisCache.get('test-key');

      expect(result).toBeNull();
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('Redis 에러 발생 시 null을 반환해야 한다', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await redisCache.get('test-key');

      expect(result).toBeNull();
    });

    it('JSON 파싱 에러 발생 시 null을 반환해야 한다', async () => {
      mockClient.get.mockResolvedValue('invalid json');

      const result = await redisCache.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();
    });

    it('TTL을 지정하여 값을 성공적으로 저장해야 한다', async () => {
      const testData = { name: 'test', value: 123 };
      mockClient.setEx.mockResolvedValue('OK');

      await redisCache.set('test-key', testData, 600);

      expect(mockClient.setEx).toHaveBeenCalledWith('test:cache:test-key', 600, JSON.stringify(testData));
    });

    it('TTL 없이 값을 성공적으로 저장해야 한다 (기본 TTL 사용)', async () => {
      const testData = { name: 'test', value: 123 };
      mockClient.setEx.mockResolvedValue('OK');

      await redisCache.set('test-key', testData);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        'test:cache:test-key',
        300, // 기본 TTL
        JSON.stringify(testData),
      );
    });

    it('TTL이 0인 경우 만료 시간 없이 저장해야 한다', async () => {
      const testData = { name: 'test', value: 123 };
      mockClient.set.mockResolvedValue('OK');

      await redisCache.set('test-key', testData, 0);

      expect(mockClient.set).toHaveBeenCalledWith('test:cache:test-key', JSON.stringify(testData));
    });

    it('연결되지 않은 상태에서는 저장하지 않아야 한다', async () => {
      // 연결 해제
      mockClient.destroy.mockResolvedValue(undefined);
      await redisCache.destroy();

      await redisCache.set('test-key', { test: 'data' });

      expect(mockClient.setEx).not.toHaveBeenCalled();
      expect(mockClient.set).not.toHaveBeenCalled();
    });

    it('Redis 에러 발생 시 조용히 실패해야 한다', async () => {
      mockClient.setEx.mockRejectedValue(new Error('Redis error'));

      await expect(redisCache.set('test-key', { test: 'data' })).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();
    });

    it('존재하는 키를 성공적으로 삭제해야 한다', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await redisCache.delete('test-key');

      expect(mockClient.del).toHaveBeenCalledWith('test:cache:test-key');
      expect(result).toBe(true);
    });

    it('존재하지 않는 키 삭제 시 false를 반환해야 한다', async () => {
      mockClient.del.mockResolvedValue(0);

      const result = await redisCache.delete('non-existent-key');

      expect(result).toBe(false);
    });

    it('연결되지 않은 상태에서 false를 반환해야 한다', async () => {
      // 연결 해제
      mockClient.destroy.mockResolvedValue(undefined);
      await redisCache.destroy();

      const result = await redisCache.delete('test-key');

      expect(result).toBe(false);
      expect(mockClient.del).not.toHaveBeenCalled();
    });

    it('Redis 에러 발생 시 false를 반환해야 한다', async () => {
      mockClient.del.mockRejectedValue(new Error('Redis error'));

      const result = await redisCache.delete('test-key');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();
    });

    it('존재하는 키에 대해 true를 반환해야 한다', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await redisCache.exists('test-key');

      expect(mockClient.exists).toHaveBeenCalledWith('test:cache:test-key');
      expect(result).toBe(true);
    });

    it('존재하지 않는 키에 대해 false를 반환해야 한다', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await redisCache.exists('non-existent-key');

      expect(result).toBe(false);
    });

    it('연결되지 않은 상태에서 false를 반환해야 한다', async () => {
      // 연결 해제
      mockClient.destroy.mockResolvedValue(undefined);
      await redisCache.destroy();

      const result = await redisCache.exists('test-key');

      expect(result).toBe(false);
      expect(mockClient.exists).not.toHaveBeenCalled();
    });

    it('Redis 에러 발생 시 false를 반환해야 한다', async () => {
      mockClient.exists.mockRejectedValue(new Error('Redis error'));

      const result = await redisCache.exists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();
    });

    it('패턴에 맞는 키들을 성공적으로 삭제해야 한다', async () => {
      const matchingKeys = ['test:cache:key1', 'test:cache:key2'];
      mockClient.scan
        .mockResolvedValueOnce({ cursor: '10', keys: matchingKeys })
        .mockResolvedValueOnce({ cursor: '0', keys: [] });
      mockClient.del.mockResolvedValue(2);

      await redisCache.clear('user:*');

      expect(mockClient.scan).toHaveBeenCalledWith('0', {
        MATCH: 'test:cache:user:*',
        COUNT: 100,
      });
      expect(mockClient.del).toHaveBeenCalledWith(matchingKeys);
    });

    it('패턴 없이 모든 키를 삭제해야 한다', async () => {
      const allKeys = ['test:cache:key1', 'test:cache:key2'];
      mockClient.scan.mockResolvedValueOnce({ cursor: '0', keys: allKeys });
      mockClient.del.mockResolvedValue(2);

      await redisCache.clear();

      expect(mockClient.scan).toHaveBeenCalledWith('0', {
        MATCH: 'test:cache:*',
        COUNT: 100,
      });
      expect(mockClient.del).toHaveBeenCalledWith(allKeys);
    });

    it('매칭되는 키가 없는 경우 삭제하지 않아야 한다', async () => {
      mockClient.scan.mockResolvedValue({ cursor: '0', keys: [] });

      await redisCache.clear('non-existent:*');

      expect(mockClient.scan).toHaveBeenCalledWith('0', {
        MATCH: 'test:cache:non-existent:*',
        COUNT: 100,
      });
      expect(mockClient.del).not.toHaveBeenCalled();
    });

    it('연결되지 않은 상태에서는 삭제하지 않아야 한다', async () => {
      // 연결 해제
      mockClient.destroy.mockResolvedValue(undefined);
      await redisCache.destroy();

      await redisCache.clear('test:*');

      expect(mockClient.scan).not.toHaveBeenCalled();
      expect(mockClient.del).not.toHaveBeenCalled();
    });

    it('Redis 에러 발생 시 조용히 실패해야 한다', async () => {
      mockClient.scan.mockRejectedValue(new Error('Redis error'));

      await expect(redisCache.clear('test:*')).resolves.not.toThrow();
    });
  });

  describe('size', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();
    });

    it('캐시 크기를 올바르게 반환해야 한다', async () => {
      const keys1 = ['test:cache:key1', 'test:cache:key2'];
      const keys2 = ['test:cache:key3'];
      mockClient.scan
        .mockResolvedValueOnce({ cursor: '10', keys: keys1 })
        .mockResolvedValueOnce({ cursor: '0', keys: keys2 });

      const result = await redisCache.size();

      expect(mockClient.scan).toHaveBeenCalledWith('0', {
        MATCH: 'test:cache:*',
        COUNT: 100,
      });
      expect(result).toBe(3);
    });

    it('빈 캐시의 크기는 0이어야 한다', async () => {
      mockClient.scan.mockResolvedValue({ cursor: '0', keys: [] });

      const result = await redisCache.size();

      expect(result).toBe(0);
    });

    it('연결되지 않은 상태에서 0을 반환해야 한다', async () => {
      // 연결 해제
      mockClient.destroy.mockResolvedValue(undefined);
      await redisCache.destroy();

      const result = await redisCache.size();

      expect(result).toBe(0);
      expect(mockClient.scan).not.toHaveBeenCalled();
    });

    it('Redis 에러 발생 시 0을 반환해야 한다', async () => {
      mockClient.scan.mockRejectedValue(new Error('Redis error'));

      const result = await redisCache.size();

      expect(result).toBe(0);
    });
  });

  describe('이벤트 핸들러', () => {
    it('연결 이벤트 시 상태를 업데이트해야 한다', () => {
      const connectCall = mockClient.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'connect',
      );
      const connectHandler = connectCall?.[1];

      expect(connectHandler).toBeDefined();
      connectHandler?.();
      expect(redisCache.isConnected()).toBe(true);
    });

    it('에러 이벤트 시 상태를 업데이트해야 한다', () => {
      // 먼저 연결 상태로 만들기
      const connectCall = mockClient.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'connect',
      );
      const connectHandler = connectCall?.[1];
      expect(connectHandler).toBeDefined();
      connectHandler?.();

      const errorCall = mockClient.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'error',
      );
      const errorHandler = errorCall?.[1];

      expect(errorHandler).toBeDefined();
      errorHandler?.(new Error('Test error'));
      expect(redisCache.isConnected()).toBe(false);
    });

    it('연결 해제 이벤트 시 상태를 업데이트해야 한다', () => {
      // 먼저 연결 상태로 만들기
      const connectCall = mockClient.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'connect',
      );
      const connectHandler = connectCall?.[1];
      expect(connectHandler).toBeDefined();
      connectHandler?.();

      const destroyCall = mockClient.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'destroy',
      );
      const destroyHandler = destroyCall?.[1];

      expect(destroyHandler).toBeDefined();
      destroyHandler?.();
      expect(redisCache.isConnected()).toBe(false);
    });
  });

  describe('private getFullKey', () => {
    it('키에 접두사를 올바르게 추가해야 한다', async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();

      mockClient.get.mockResolvedValue(null);

      await redisCache.get('test-key');

      expect(mockClient.get).toHaveBeenCalledWith('test:cache:test-key');
    });

    it('빈 키에도 접두사를 추가해야 한다', async () => {
      mockClient.connect.mockResolvedValue(undefined);
      await redisCache.connect();

      mockClient.get.mockResolvedValue(null);

      await redisCache.get('');

      expect(mockClient.get).toHaveBeenCalledWith('test:cache:');
    });
  });
});
