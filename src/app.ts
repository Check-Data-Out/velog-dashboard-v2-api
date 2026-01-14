import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

import logger from '@/configs/logger.config';
import router from '@/routes';
import { NotFoundError } from '@/exception';

import { options } from '@/configs/swagger.config';
import { getSentryStatus } from '@/configs/sentry.config';
import { getCacheStatus } from '@/configs/cache.config';
import { createErrorHandlingMiddleware } from '@/middlewares/errorHandling.middleware';
import { accessLogMiddleware } from '@/middlewares/accessLog.middleware';
import { setRateLimitService } from '@/middlewares/auth.middleware';
import { AuthRateLimitService } from '@/services/authRateLimit.service';
import { ICache } from '@/modules/cache/cache.type';

dotenv.config();

/**
 * Express 앱을 생성하는 팩토리 함수
 * Cache가 초기화된 후에 호출되어야 함
 * @param cache - 초기화된 캐시 인스턴스
 * @returns Express Application
 */
export function createApp(cache: ICache): Application {
  const app: Application = express();

  // 인증 실패 Rate Limit 서비스 생성 및 전역 설정
  const authRateLimitService = new AuthRateLimitService(cache);
  setRateLimitService(authRateLimitService);

  // 실제 클라이언트 IP를 알기 위한 trust proxy 설정
  app.set('trust proxy', process.env.NODE_ENV === 'production');

  const swaggerSpec = swaggerJSDoc(options);

  app.use(accessLogMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' })); // 파일 업로드 대비
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    cors({
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim())
          : 'http://localhost:3000',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'access_token', 'refresh_token'],
      credentials: true,
    }),
  );

  // 헬스체크 엔드포인트
  app.get('/health', async (req: Request, res: Response) => {
    // 기본 정보
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {
        sentry: false,
        cache: false,
      },
    };

    // Sentry 상태 확인
    try {
      healthData.services.sentry = getSentryStatus();
    } catch (error) {
      healthData.services.sentry = false;
      logger.error('Failed to health check for sentry:', error);
    }

    // Cache 상태 확인
    try {
      healthData.services.cache = await getCacheStatus();
    } catch (error) {
      healthData.services.cache = false;
      logger.error('Failed to health check for cache:', error);
    }

    res.status(200).json(healthData);
  });

  // Swagger는 개발 환경에서만
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use('/api', router);

  // 404 에러 핸들링 수정 (throw 대신 next 사용)
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`${req.url} not found`));
  });

  app.use(createErrorHandlingMiddleware(authRateLimitService));

  return app;
}
