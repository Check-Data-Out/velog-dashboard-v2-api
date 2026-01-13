import { ICache } from '@/modules/cache/cache.type';
import logger from '@/configs/logger.config';

interface AuthFailureRecord {
  count: number;
  firstFailure: number;
}

const CONFIG = {
  KEY_PREFIX: 'auth-failure:',
  FAILURE_THRESHOLD: 5,
  WINDOW_SECONDS: 5 * 60,
  LOCKOUT_SECONDS: 15 * 60,
};

export class AuthRateLimitService {
  constructor(private cache: ICache) {}

  async trackAuthFailure(ip: string): Promise<void> {
    try {
      const key = `${CONFIG.KEY_PREFIX}${ip}`;
      const existing = await this.cache.get<AuthFailureRecord>(key);
      const now = Date.now();

      let record: AuthFailureRecord;
      if (existing && now - existing.firstFailure < CONFIG.WINDOW_SECONDS * 1000) {
        record = { count: existing.count + 1, firstFailure: existing.firstFailure };
      } else {
        record = { count: 1, firstFailure: now };
      }

      await this.cache.set(key, record, CONFIG.LOCKOUT_SECONDS);

      if (record.count >= CONFIG.FAILURE_THRESHOLD) {
        logger.warn('Auth brute force detected', { ip, failures: record.count });
      }
    } catch (error) {
      logger.error('Failed to track auth failure', { ip, error });
    }
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    try {
      const key = `${CONFIG.KEY_PREFIX}${ip}`;
      const record = await this.cache.get<AuthFailureRecord>(key);
      return record !== null && record.count >= CONFIG.FAILURE_THRESHOLD;
    } catch (error) {
      logger.error('Failed to check IP block status', { ip, error });
      return false;
    }
  }

  async clearFailures(ip: string): Promise<void> {
    try {
      const key = `${CONFIG.KEY_PREFIX}${ip}`;
      await this.cache.delete(key);
    } catch (error) {
      logger.error('Failed to clear auth failures', { ip, error });
    }
  }
}
