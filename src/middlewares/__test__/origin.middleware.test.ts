import { Request, Response } from 'express';
import { verifyRequestOrigin } from '@/middlewares/origin.middleware';

const DASHBOARD = 'https://velog-dashboard.kro.kr';

describe('verifyRequestOrigin', () => {
  const middleware = verifyRequestOrigin([DASHBOARD]);
  let nextFunction: jest.Mock;

  const run = (req: Partial<Request>) =>
    middleware({ method: 'POST', headers: {}, cookies: {}, ...req } as Request, {} as Response, nextFunction);

  beforeEach(() => {
    nextFunction = jest.fn();
  });

  it('다른 사이트에서 온 비-GET 요청은 403 으로 거부해야 한다', () => {
    run({ headers: { origin: 'https://evil.example' }, cookies: { vd_session: 'session' } });

    expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('출처 헤더 없이 쿠키가 실린 비-GET 요청은 거부해야 한다', () => {
    run({ cookies: { vd_session: 'session' } });

    expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it.each([
    ['대시보드 Origin', { headers: { origin: DASHBOARD }, cookies: { vd_session: 'session' } }],
    ['Origin 없이 대시보드 Referer', { headers: { referer: `${DASHBOARD}/main` }, cookies: { vd_session: 'session' } }],
    ['쿠키 없는 서버 간 요청(웹훅·헤더 토큰)', { headers: { access_token: 'token' } }],
    ['GET 요청', { method: 'GET', headers: { origin: 'https://evil.example' }, cookies: { vd_session: 'session' } }],
  ])('%s 은 통과시켜야 한다', (_, req) => {
    run(req as Partial<Request>);

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('다른 사이트 Referer 는 거부해야 한다', () => {
    run({ headers: { referer: 'https://evil.example/page' }, cookies: { vd_session: 'session' } });

    expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
