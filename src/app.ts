import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './routes/user.router';
import cookieParser from 'cookie-parser';
dotenv.config();

const app: Application = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

app.use('/', router);
app.get('/', (req, res) => {
  res.send('Hello, V.D.!');
});
export default app;
