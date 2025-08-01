import dotenv from 'dotenv';
import pg from 'pg';
import logger from '@/configs/logger.config';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { Pool } = pg;

dotenv.config();

// local 세팅 및 접근시 SSL 은 기본 X, production 에서만 추가
const poolConfig: pg.PoolConfig = {
  database: process.env.DATABASE_NAME,
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
  max: 10, // 최대 연결 수
  idleTimeoutMillis: 30000, // 연결 유휴 시간 (30초)
  connectionTimeoutMillis: 10000, // 연결 시간 초과 (10초)
};

if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

/**
 * 데이터베이스 연결을 초기화하고 TimescaleDB 확장을 보장
 * 최대 3회 재시도하며, 실패 시 서버를 종료
 *
 * @throws 연결에 3회 실패하면 서버가 종료
 * @returns {Promise<void>} 연결 및 확장 완료 시 resolve되는 프로미스
 */
export async function initializeDatabase(): Promise<void> {
  const maxRetries = 3;
  let delay = 800;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`데이터베이스 연결 시도 ${attempt}/${maxRetries}`);

      const client = await pool.connect();

      try {
        // 연결 테스트
        await client.query('SELECT 1');
        logger.info('데이터베이스 연결 성공');

        // TimescaleDB 확장 (필수)
        await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
        logger.info('TimescaleDB 확장 성공');

        return; // 성공
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error(`데이터베이스 연결 실패 (시도 ${attempt}/${maxRetries}):`, error);

      if (attempt === maxRetries) {
        logger.error('데이터베이스 연결에 완전히 실패했습니다. 서버를 종료합니다.');
        process.exit(1); // 연결 실패시 서버 종료
      }

      logger.info(`${delay}ms 후 재시도...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.floor(delay * 1.5);
    }
  }
}


/**
 * 데이터베이스 커넥션 풀을 안정적으로 직접 종료하는 함수
 *
 * @throws 데이터베이스 연결 종료에 실패할 경우 에러
 * @returns {Promise<void>} 데이터베이스 연결이 종료되면 resolve되는 프로미스
 */
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('데이터베이스 연결이 정상적으로 종료되었습니다.');
  } catch (error) {
    logger.error('데이터베이스 연결 종료 중 오류 발생:', error);
    throw error;
  }
}

export default pool;
