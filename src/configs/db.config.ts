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

async function initializeDatabase(): Promise<void> {
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
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.floor(delay * 1.5);
    }
  }
}

initializeDatabase().catch(error => {
  logger.error('데이터베이스 초기화 중 예상치 못한 오류:', error);
  process.exit(1); // 치명적 오류시 서버 종료
});

export default pool;