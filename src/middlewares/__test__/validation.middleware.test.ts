import 'reflect-metadata';
import http from 'http';
import { AddressInfo } from 'net';
import express, { NextFunction, Request, Response } from 'express';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { GetUserLeaderboardQueryDto, LoginRequestDto } from '@/types';
import { BadRequestError } from '@/exception';

// mock req 로는 Express 5 의 getter 전용 req.query 를 재현할 수 없어 실제 앱에 요청을 보낸다
const request = async (app: express.Express, method: string, path: string) =>
  new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      const req = http.request({ host: '127.0.0.1', port, method, path }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
        });
      });
      req.on('error', (error) => {
        server.close();
        reject(error);
      });
      req.end();
    });
  });

// 오류 처리 미들웨어로 인식되려면 인자가 4개여야 한다
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(err instanceof BadRequestError ? 400 : 500).json({ error: err.message });
};

describe('validateRequestDto (실제 express 앱)', () => {
  it('검증·변환된 query 를 핸들러에 전달해야 한다', async () => {
    const app = express();
    app.get('/leaderboard', validateRequestDto(GetUserLeaderboardQueryDto, 'query'), (req, res) => {
      res.json(res.locals.query);
    });
    app.use(errorHandler);

    const res = await request(app, 'GET', '/leaderboard?sort=likeCount&dateRange=7&limit=5');

    expect(res).toEqual({ status: 200, body: { sort: 'likeCount', dateRange: 7, limit: 5 } });
  });

  it('query 검증에 실패하면 400 으로 거부해야 한다', async () => {
    const app = express();
    app.get('/leaderboard', validateRequestDto(GetUserLeaderboardQueryDto, 'query'), (req, res) => {
      res.json(res.locals.query);
    });
    app.use(errorHandler);

    const res = await request(app, 'GET', '/leaderboard?limit=100');

    expect(res.status).toBe(400);
  });

  it('JSON 이 아닌(본문 없는) 요청도 400 으로 거부해야 한다', async () => {
    const app = express();
    app.use(express.json());
    app.post('/login', validateRequestDto(LoginRequestDto, 'body'), (req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const res = await request(app, 'POST', '/login');

    expect(res.status).toBe(400);
  });
});
