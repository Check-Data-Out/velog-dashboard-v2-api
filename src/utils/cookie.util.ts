import { CookieOptions, Response } from 'express';
import { User } from '@/types';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from '@/utils/session.util';

const THREE_WEEKS_IN_MS = 21 * 24 * 60 * 60 * 1000;

/**
 * 환경 및 쿠키 삭제 여부에 따라 쿠키 옵션을 생성합니다.
 *
 * @param isClear - true일 경우 쿠키 삭제용 옵션을 생성합니다. 기본값은 false입니다.
 * @returns 현재 환경에 맞게 설정된 CookieOptions 객체를 반환합니다.
 */
export const cookieOption = (isClear: boolean = false): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  const options: CookieOptions = {
    httpOnly: isProd,
    secure: isProd,
    sameSite: isProd ? 'lax' : undefined,
    domain: isProd ? 'velog-dashboard.kro.kr' : 'localhost',
  };

  if (isProd && !isClear) {
    options.maxAge = THREE_WEEKS_IN_MS;
  }

  return options;
};

const LEGACY_TOKEN_COOKIES = ['access_token', 'refresh_token'] as const;

/**
 * velog 토큰 쿠키를 지우고 대시보드 세션 쿠키를 심습니다. 같은 이름의 세션 쿠키는 덮어쓴다.
 */
export const setSessionCookie = (res: Response, user: Pick<User, 'id' | 'velog_uuid' | 'session_version'>): void => {
  LEGACY_TOKEN_COOKIES.forEach((name) => res.clearCookie(name, cookieOption(true)));
  res.cookie(SESSION_COOKIE_NAME, signSession(user), {
    ...cookieOption(),
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
};
