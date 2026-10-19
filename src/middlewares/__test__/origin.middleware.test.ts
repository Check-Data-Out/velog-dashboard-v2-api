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

  it.each([
    ['다른 사이트 Origin', { headers: { origin: 'https://other.example' }, cookies: { vd_session: 'session' } }],
    ['대시보드 도메인으로 시작하는 다른 사이트', { headers: { origin: `${DASHBOARD}.other.example` } }],
    ["값이 'null' 인 Origin", { headers: { origin: 'null' }, cookies: { vd_session: 'session' } }],
    ['다른 사이트 Referer', { headers: { referer: 'https://other.example/page' }, cookies: { vd_session: 'session' } }],
    ['출처 헤더 없이 세션 쿠키', { cookies: { vd_session: 'session' } }],
    ['출처 헤더 없이 velog 토큰 쿠키', { cookies: { access_token: 'token' } }],
  ])('%s 가 실린 비-GET 요청은 403 으로 거부해야 한다', (_, req) => {
    run(req as Partial<Request>);

    expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it.each([
    ['대시보드 Origin', { headers: { origin: DASHBOARD }, cookies: { vd_session: 'session' } }],
    ['Origin 없이 대시보드 Referer', { headers: { referer: `${DASHBOARD}/main` }, cookies: { vd_session: 'session' } }],
    ['쿠키 없는 서버 간 요청(웹훅·헤더 토큰)', { headers: { access_token: 'token' } }],
    ['GET 요청', { method: 'GET', headers: { origin: 'https://other.example' }, cookies: { vd_session: 'session' } }],
  ])('%s 은 통과시켜야 한다', (_, req) => {
    run(req as Partial<Request>);

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('허용 목록에 빈 항목이 있어도 해석할 수 없는 Origin 은 거부해야 한다', () => {
    verifyRequestOrigin([DASHBOARD, ''])(
      { method: 'POST', headers: { origin: 'null' }, cookies: {} } as Request,
      {} as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('허용 목록 값은 끝 슬래시 등 표기 차이와 무관하게 출처로 비교해야 한다', () => {
    verifyRequestOrigin([`${DASHBOARD}/`])(
      { method: 'POST', headers: { origin: DASHBOARD }, cookies: {} } as Request,
      {} as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalledWith();
  });
});
