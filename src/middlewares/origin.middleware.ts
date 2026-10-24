import { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '@/exception';
import { SESSION_COOKIE_NAME } from '@/utils/session.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIES = [SESSION_COOKIE_NAME];

const toOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * 쿠키로 인증되거나 쿠키를 바꾸는 요청이 다른 사이트에서 오지 않았는지 확인한다 (CSRF 방어).
 * 비-GET 요청의 Origin(없으면 Referer)이 허용 목록에 없거나, 출처 없이 인증 쿠키가 실려 있으면 거부한다.
 */
export const verifyRequestOrigin = (allowedOrigins: string[]) => {
  // 요청의 Origin 과 같은 기준(new URL().origin)으로 맞춰 둔다
  const allowed = new Set(allowedOrigins.map(toOrigin).filter((origin) => origin !== null && origin !== 'null'));

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const source = req.headers.origin ?? req.headers.referer;
    if (source) {
      const origin = toOrigin(source);
      return origin !== null && allowed.has(origin)
        ? next()
        : next(new ForbiddenError('허용되지 않은 출처의 요청입니다.'));
    }

    // 출처 헤더가 없는 요청은 브라우저가 아닌 서버 간 호출(웹훅 등)만 받는다
    const hasAuthCookie = AUTH_COOKIES.some((name) => req.cookies?.[name] !== undefined);
    if (hasAuthCookie) return next(new ForbiddenError('출처를 확인할 수 없는 요청입니다.'));

    next();
  };
};
