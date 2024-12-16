import dotenv from 'dotenv';
import pg from 'pg';
import logger from './logger.config';
// eslint-disable-next-line @typescript-eslint/naming-convention
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
  ssl: {
    rejectUnauthorized: false,
  },
});

// timescaleDB 확장. 최초 1회 이므로 즉시실행 함수로
(async () => {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
    console.log('확장 성공');
  } catch (error) {
    logger.error('초기화 실패', error);
  } finally {
    client.release();
  }
})();
export default pool;
