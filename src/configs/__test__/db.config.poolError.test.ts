import * as Sentry from '@sentry/node';
import logger from '@/configs/logger.config';
import pool from '@/configs/db.config';

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/configs/logger.config', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('db.config pool error', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('idle 클라이언트 오류가 발생해도 프로세스가 죽지 않고 warning 으로 보고해야 한다', () => {
    const err = new Error('terminating connection due to administrator command');

    expect(() => pool.emit('error', err, {} as never)).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), err);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { level: 'warning' });
  });
});
