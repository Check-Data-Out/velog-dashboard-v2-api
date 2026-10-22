import { CookieOptions, Response } from 'express';
import { User } from '@/types';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from '@/utils/session.util';

/**
 * 현재 환경에 맞는 쿠키 옵션을 생성합니다.
 */
const cookieOption = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: isProd,
    secure: isProd,
    sameSite: isProd ? 'lax' : undefined,
    domain: isProd ? 'velog-dashboard.kro.kr' : 'localhost',
  };
};

// 세션 쿠키 도입 전에 발급한 velog 토큰 쿠키. 브라우저에 남아 있을 수 있어 함께 지운다
const LEGACY_TOKEN_COOKIES = ['access_token', 'refresh_token'] as const;

/**
 * 대시보드 세션 쿠키를 심습니다. 같은 이름의 세션 쿠키는 덮어쓴다.
 */
export const setSessionCookie = (res: Response, user: Pick<User, 'id' | 'velog_uuid' | 'session_version'>): void => {
  res.cookie(SESSION_COOKIE_NAME, signSession(user), {
    ...cookieOption(),
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
};

/**
 * 세션 쿠키와 남아 있을 수 있는 velog 토큰 쿠키를 모두 지웁니다.
 */
export const clearAuthCookies = (res: Response): void => {
  [...LEGACY_TOKEN_COOKIES, SESSION_COOKIE_NAME].forEach((name) => res.clearCookie(name, cookieOption()));
};
