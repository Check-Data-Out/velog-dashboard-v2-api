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
import { verifyRequestOrigin } from '@/middlewares/origin.middleware';

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

  // 운영 요청은 LB → 서버 nginx(docker) → API 순서다. 서버 nginx 가 신뢰 프록시 목록으로 푼 접속 IP 를
  // X-Forwarded-For 끝에 붙이므로 docker 내부망만 믿으면 req.ip 가 그 값이 된다(앞쪽 값은 요청자가 꾸밀 수 있음)
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 'loopback, uniquelocal' : false);

  const swaggerSpec = swaggerJSDoc(options);

  app.use(accessLogMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' })); // 파일 업로드 대비
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const configuredOrigins =
    process.env.ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  // 개발 환경은 FE·Swagger UI 기본 출처에 설정값을 더한다
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...new Set(['http://localhost:3000', `http://localhost:${process.env.PORT || 8080}`, ...configuredOrigins])];
  // 비-GET 요청은 이 목록으로 출처를 확인하므로, 비어 있으면 로그인부터 전부 막힌다
  if (allowedOrigins.length === 0) throw new Error('ALLOWED_ORIGINS must include the dashboard origin');

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'access_token', 'refresh_token'],
      credentials: true,
    }),
  );
  app.use(verifyRequestOrigin(allowedOrigins));

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
