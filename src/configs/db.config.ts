import dotenv from 'dotenv';
import pg from 'pg';
import logger from './logger.config';
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
};

if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

(async () => {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
    logger.info('TimescaleDB 확장 성공');
  } catch (error) {
    logger.error('TimescaleDB 초기화 실패 : ', error);
  } finally {
    client.release();
  }
})();
export default pool;
