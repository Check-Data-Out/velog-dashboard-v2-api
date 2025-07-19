import app from '@/app';
import logger from '@/configs/logger.config';

const port = parseInt(process.env.PORT || '8080', 10);

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`API Docs: http://localhost:${port}/api-docs`);
  }
  logger.info(`Health Check: http://localhost:${port}/health`);
});

// 기본적인 graceful shutdown 추가
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // 강제 종료 타이머 (10초)
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 예상치 못한 에러 처리
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
