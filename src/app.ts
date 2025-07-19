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
import { initSentry } from '@/configs/sentry.config';
import { initCache } from '@/configs/cache.config';
import { errorHandlingMiddleware } from '@/middlewares/errorHandling.middleware';

dotenv.config();

initSentry();  // Sentry 초기화
initCache();  // Redis 캐시 초기화

const app: Application = express();

// 실제 클라이언트 IP를 알기 위한 trust proxy 설정
app.set('trust proxy', process.env.NODE_ENV === 'production');

const swaggerSpec = swaggerJSDoc(options);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // 파일 업로드 대비
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim())
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
      cache: false
    }
  };

  // Sentry 상태 확인
  try {
    const { getSentryStatus } = await import('./configs/sentry.config.ts');
    healthData.services.sentry = getSentryStatus();
  } catch (error) {
    healthData.services.sentry = false;
    logger.error('Failed to health check for sentry:', error);
  }

  // Cache 상태 확인
  try {
    const { getCacheStatus } = await import('./configs/cache.config.ts');
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

app.use(errorHandlingMiddleware);

export default app;