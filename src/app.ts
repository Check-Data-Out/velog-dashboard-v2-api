import 'reflect-metadata';
import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import router from './routes';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { options } from '@/configs/swagger.config';
import { errorHandlingMiddleware } from './middlewares/errorHandling.middleware';
import { NotFoundError } from './exception';

dotenv.config();

const app: Application = express();
// 실제 클라이언트 IP를 알기 위한 trust proxy 설정
app.set('trust proxy', true);
const swaggerSpec = swaggerJSDoc(options);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'access_token', 'refresh_token'],
    credentials: true,
  }),
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', router);
app.use((req) => {
  throw new NotFoundError(`${req.url} not found`);
});
app.use(errorHandlingMiddleware);

export default app;
