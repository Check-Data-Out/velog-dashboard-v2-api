import 'reflect-metadata';
import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import router from './routes/user.router';
import { errorHandlingMiddleware } from './middlewares/error-handling.middleware';

dotenv.config();

const app: Application = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
  }),
);
app.use('/', router);
app.get('/', (req, res) => {
  res.send('Hello, V.D.!');
});
app.use(errorHandlingMiddleware);

export default app;
