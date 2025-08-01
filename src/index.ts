import app from '@/app';
import logger from '@/configs/logger.config';
import { closeCache } from './configs/cache.config';
import { closeDatabase, initializeDatabase } from './configs/db.config';
import { Server } from 'http';

const port = parseInt(process.env.PORT || '8080', 10);

async function startServer() {
  try {
    // 데이터베이스 초기화
    await initializeDatabase();
    logger.info('데이터베이스 초기화 완료');

    // 서버 시작
    const server = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`API Docs: http://localhost:${port}/api-docs`);
      }
      logger.info(`Health Check: http://localhost:${port}/health`);
    });

    // Graceful shutdown 핸들러 설정
    setupGracefulShutdown(server);
  } catch (error) {
    logger.error('서버 시작 중 오류 발생:', error);
    process.exit(1);
  }
}

function setupGracefulShutdown(server: Server) {
  // 기본적인 graceful shutdown 추가
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);

    try {
      // HTTP 서버 종료
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });

      // 데이터베이스 연결 종료
      await closeDatabase();

      // 캐시 연결 종료
      await closeCache();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Graceful shutdown 중 오류 발생:', error);
      process.exit(1);
    }
  };

  // 시그널 핸들러 등록
  process.on('SIGTERM', async () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', async () => gracefulShutdown('SIGINT'));

  // 예상치 못한 에러 처리
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught Exception:', error);
    await gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', async (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await gracefulShutdown('UNHANDLED_REJECTION');
  });

  // 강제 종료 타이머 (10초)
  const forceExitTimer = setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  // graceful shutdown이 완료되면 타이머 해제
  process.on('exit', () => {
    clearTimeout(forceExitTimer);
  });
}

// 서버 시작
startServer();
