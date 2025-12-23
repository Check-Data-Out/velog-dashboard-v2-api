import { createClient, RedisClientType } from 'redis';

import logger from '@/configs/logger.config';
import { ICache, CacheConfig } from './cache.type';

export class RedisCache implements ICache {
  private client: RedisClientType;
  private connected: boolean = false;
  private keyPrefix: string;
  private defaultTTL: number;

  constructor(config: CacheConfig) {
    this.keyPrefix = config.keyPrefix || 'vd2:cache:';
    this.defaultTTL = config.defaultTTL || 300;

    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port,
      },
      password: config.password,
      database: config.db || 0,
    });

    this.setupEventHandlers();
  }

  /**
   * Redis 클라이언트의 이벤트 핸들러를 설정합니다.
   * 에러, 연결, 연결 해제 시 상태를 변경하고 로그를 남깁니다.
   *
   * @private
   */
  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.connected = true;
    });

    this.client.on('destroy', () => {
      logger.warn('Redis Client Destroyed');
      this.connected = false;
    });
  }

  /**
   * 주어진 키에 keyPrefix를 접두사로 붙여 전체 Redis 키를 생성합니다.
   *
   * @param key - 접두사가 붙을 원본 키 문자열
   * @returns keyPrefix가 포함된 전체 Redis 키 문자열
   */
  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async connect(): Promise<void> {
    try {
      if (!this.connected) {
        await this.client.connect();
        this.connected = true;
        logger.info('Redis cache connection established');
      }
    } catch (error) {
      logger.error('Failed to connect to Redis cache:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.connected) {
        this.client.destroy();
        this.connected = false;
        logger.info('Redis cache connection closed');
      }
    } catch (error) {
      logger.error('Failed to destroy from Redis cache:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping cache get');
        return null;
      }

      const value = await this.client.get(this.getFullKey(key));
      if (!value) return null;

      // JSON.parse가 실패할 경우를 명시적으로 처리
      try {
        return JSON.parse(value);
      } catch (parseError) {
        logger.error(`Failed to parse cached value for key ${key}:`, parseError);
        // 손상된 캐시 데이터 삭제
        await this.delete(key);
        return null;
      }
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping cache set');
        return;
      }

      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      const ttl = ttlSeconds ?? this.defaultTTL;

      if (ttl > 0) {
        await this.client.setEx(fullKey, ttl, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      // 캐시 오류 시에도 애플리케이션은 계속 동작
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping cache delete');
        return false;
      }

      const result = await this.client.del(this.getFullKey(key));
      return result > 0;
    } catch (error) {
      logger.error(`Cache DELETE error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping cache exists');
        return false;
      }

      const result = await this.client.exists(this.getFullKey(key));
      return result > 0;
    } catch (error) {
      logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async clear(pattern?: string, batchSize: number = 100): Promise<void> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping cache clear');
        return;
      }

      const searchPattern = pattern ? `${this.keyPrefix}${pattern}` : `${this.keyPrefix}*`;

      let cursor = '0';
      let totalDeleted = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: searchPattern,
          COUNT: batchSize,
        });

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          await this.client.del(keys);
          totalDeleted += keys.length;
        }

        if (cursor !== '0') {
          await new Promise((resolve) => setImmediate(resolve));
        }
      } while (cursor !== '0');

      if (totalDeleted > 0) {
        logger.info(`Cache cleared: ${totalDeleted} keys deleted`);
      }
    } catch (error) {
      logger.error(`Cache CLEAR error for pattern ${pattern}:`, error);
    }
  }

  async size(): Promise<number> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping cache size, return 0');
        return 0;
      }

      let cursor = '0';
      let count = 0;
      const batchSize = 100;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: `${this.keyPrefix}*`,
          COUNT: batchSize,
        });

        cursor = result.cursor;
        count += result.keys.length;

        if (cursor !== '0') {
          await new Promise((resolve) => setImmediate(resolve));
        }
      } while (cursor !== '0');

      return count;
    } catch (error) {
      logger.error('Cache SIZE error:', error);
      return 0;
    }
  }

  /**
   * Redis List에 데이터를 추가합니다 (LPUSH).
   * @param queueKey 큐 키
   * @param data 추가할 데이터 (JSON으로 직렬화됨)
   * @returns 추가 후 리스트의 길이
   */
  async pushToQueue<T>(queueKey: string, data: T): Promise<number | null> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping queue push');
        return null;
      }

      const fullKey = `vd2:queue:${queueKey}`;
      const serializedData = JSON.stringify(data);

      const length = await this.client.lPush(fullKey, serializedData);
      return length;
    } catch (error) {
      logger.error(`Queue PUSH error for key ${queueKey}:`, error);
      return null;
    }
  }

  /**
   * Redis List에서 특정 userId가 존재하는지 확인합니다.
   * @param queueKey 큐 키
   * @param userId 확인할 사용자 ID
   * @returns userId가 큐에 존재하면 true, 아니면 false
   */
  async isUserInQueue(queueKey: string, userId: number): Promise<boolean> {
    try {
      if (!this.connected) {
        logger.warn('Redis not connected, skipping queue check');
        return false;
      }

      const fullKey = `vd2:queue:${queueKey}`;

      // LRANGE로 큐의 모든 항목 조회
      const items = await this.client.lRange(fullKey, 0, -1);

      // 각 항목을 파싱하여 userId 확인
      for (const item of items) {
        try {
          const parsedItem = JSON.parse(item);
          if (parsedItem.userId === userId) {
            return true;
          }
        } catch (parseError) {
          logger.warn(`Failed to parse queue item: ${item}`, parseError);
        }
      }

      return false;
    } catch (error) {
      logger.error(`Queue CHECK error for key ${queueKey}:`, error);
      return false;
    }
  }
}
