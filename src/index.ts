import app from '@/app';
import logger from '@/configs/logger.config';
import { closeCache, initCache } from './configs/cache.config';
import { closeDatabase, initializeDatabase } from './configs/db.config';
import { Server } from 'http';
import { initSentry } from './configs/sentry.config';

interface ShutdownHandler {
  cleanup(): Promise<void>;
}

/**
 * 서버의 graceful shutdown을 담당하는 매니저 클래스
 */
class GracefulShutdownManager implements ShutdownHandler {
  private isShuttingDown = false;
  private readonly shutdownTimeout = 10000; // 10초 강제 종료 타이머

  constructor(private server: Server) { }

  /**
   * 모든 연결을 안전하게 정리하고 서버를 종료
   */
  async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    // 강제 종료 타이머 설정 (데드락 방지)
    const forceExitTimer = setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // HTTP 서버 종료
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });

      // 데이터베이스 연결 종료
      await closeDatabase();
      logger.info('Database connections closed');

      // 캐시 연결 종료
      await closeCache();
      logger.info('Cache connections closed');

      clearTimeout(forceExitTimer); // 정상 종료 시 강제 타이머 해제
      logger.info('Graceful shutdown completed');
    } catch (error) {
      clearTimeout(forceExitTimer);
      throw error;
    }
  }

  /**
   * 시그널을 받아 graceful shutdown을 시작
   */
  handleShutdown(signal: string): void {
    if (this.isShuttingDown) {
      logger.info(`Already shutting down, ignoring ${signal}`);
      return;
    }

    logger.info(`${signal} received, shutting down gracefully`);

    // 비동기 cleanup 실행 후 프로세스 종료
    this.cleanup()
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      });
  }
}

/**
 * Express 서버의 시작과 lifecycle을 관리하는 메인 클래스
 */
class ServerManager {
  private server?: Server;
  private shutdownManager?: GracefulShutdownManager;
  private readonly port = parseInt(process.env.PORT || '8080', 10);

  /**
   * 서버를 초기화하고 시작
   */
  async start(): Promise<void> {
    try {
      await this.initializeServices();
      this.server = this.createServer();
      this.setupShutdownHandlers(); // 시그널 핸들러 등록

      logger.info('Server started successfully');
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * 데이터베이스 등 필요한 서비스들을 초기화
   */
  private async initializeServices(): Promise<void> {
    // Sentry 초기화 (에러 모니터링을 위해 가장 먼저)
    initSentry();
    logger.info('Sentry initialized successfully');

    // Cache 초기화
    initCache();
    logger.info('Cache initialized successfully');

    // 데이터베이스 초기화
    await initializeDatabase();
    logger.info('Database initialized successfully');
  }

  /**
   * Express 서버 인스턴스를 생성하고 시작
   */
  private createServer(): Server {
    const server = app.listen(this.port, () => {
      logger.info(`Server running on port ${this.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);

      // 개발 환경에서만 API 문서 URL 표시
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`API Docs: http://localhost:${this.port}/api-docs`);
      }

      logger.info(`Health Check: http://localhost:${this.port}/health`);
    });

    return server;
  }

  /**
   * 프로세스 시그널 핸들러와 에러 핸들러를 설정
   */
  private setupShutdownHandlers(): void {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    // shutdown manager 인스턴스 생성
    this.shutdownManager = new GracefulShutdownManager(this.server);

    // Graceful shutdown 시그널 핸들러 등록
    process.on('SIGTERM', () => {
      if (this.shutdownManager) {
        this.shutdownManager.handleShutdown('SIGTERM');
      }
    });

    process.on('SIGINT', () => {
      if (this.shutdownManager) {
        this.shutdownManager.handleShutdown('SIGINT');
      }
    });

    // 치명적 에러 발생 시 즉시 종료
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1); // graceful shutdown 없이 즉시 종료
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);

      // 개발 환경에서는 더 엄격하게 처리
      if (process.env.NODE_ENV === 'development') {
        process.exit(1);
      }
    });
  }
}

// 애플리케이션 진입점
const serverManager = new ServerManager();
serverManager.start().catch((error) => {
  logger.error('Fatal error during server startup:', error);
  process.exit(1);
});