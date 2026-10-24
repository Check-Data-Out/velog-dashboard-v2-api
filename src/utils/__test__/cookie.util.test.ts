import { Response } from 'express';
import { clearAuthCookies, setSessionCookie } from '@/utils/cookie.util';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/utils/session.util';
import { mockUser } from '@/utils/fixtures';

const createResponse = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as unknown as jest.Mocked<Response>;

describe('cookie.util', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  const prodOption = { httpOnly: true, secure: true, sameSite: 'lax', domain: 'velog-dashboard.kro.kr' };

  it('운영에서는 발급할 때와 같은 도메인·옵션으로 세 인증 쿠키를 모두 지운다', () => {
    process.env.NODE_ENV = 'production';
    const res = createResponse();

    clearAuthCookies(res);

    expect(res.clearCookie.mock.calls).toEqual([
      ['access_token', prodOption],
      ['refresh_token', prodOption],
      [SESSION_COOKIE_NAME, prodOption],
    ]);
  });

  it('세션을 발급하면서 남아 있는 velog 토큰 쿠키를 지운다', () => {
    process.env.NODE_ENV = 'production';
    const res = createResponse();

    setSessionCookie(res, mockUser);

    expect(res.clearCookie.mock.calls).toEqual([
      ['access_token', prodOption],
      ['refresh_token', prodOption],
    ]);
    expect(res.cookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, expect.any(String), {
      ...prodOption,
      maxAge: SESSION_MAX_AGE_SECONDS * 1000,
    });
  });
});
