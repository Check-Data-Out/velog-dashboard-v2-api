import logger from '@/configs/logger.config';

import { ICache, CacheConfig } from '@/modules/cache/cache.type';
import { RedisCache } from '@/modules/cache/redis.cache';

const cacheConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'notion-check-plz',
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'vd2:cache:',
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300'), // 5분
};

// 싱글톤 캐시 인스턴스 (const로 변경하고 null 초기화)
const cacheInstance: ICache = new RedisCache(cacheConfig);
export const cache = cacheInstance;

// 캐시 상태 추적 변수
let cacheInitialized = false;

// 초기화 함수
export const initCache = async (): Promise<void> => {
  try {
    await cache.connect();
    cacheInitialized = true;
    logger.info('Cache system initialized successfully');
  } catch (error) {
    cacheInitialized = false;
    logger.error('Failed to initialize cache system:', error);
    // 캐시 연결 실패해도 애플리케이션은 계속 실행
    logger.warn('Application will continue without cache');
  }
};

// 종료 함수
export const closeCache = async (): Promise<void> => {
  try {
    cache.destroy();
    cacheInitialized = false;
    logger.info('Cache system closed successfully');
  } catch (error) {
    logger.error('Failed to close cache system:', error);
  }
};

// 캐시 상태 확인 함수
export const getCacheStatus = async (): Promise<boolean> => {
  if (!cacheInitialized) {
    return false;
  }

  try {
    // Redis ping 명령어로 연결 상태 확인
    await cache.set('health-check', 'ok', 1); // 1초 TTL로 테스트 키 설정
    await cache.get('health-check'); // 읽기 테스트
    return true;
  } catch (error) {
    logger.warn('Cache health check failed:', error);
    return false;
  }
};
