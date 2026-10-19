import { CookieOptions } from 'express';

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
