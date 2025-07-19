export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxSize?: number;
  defaultTTL?: number;
  strategy?: 'lru' | 'ttl' | 'combined';
}

export interface CacheMetadata {
  key: string;
  size: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  ttl?: number;
  expiresAt?: number;
}

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<void>;
  size(): Promise<number>;
}

