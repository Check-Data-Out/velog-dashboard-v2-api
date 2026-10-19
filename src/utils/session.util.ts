import dotenv from 'dotenv';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '@/types';

dotenv.config();

const SECRET = process.env.SESSION_JWT_SECRET;
if (!SECRET || Buffer.byteLength(SECRET) < 32) {
  throw new Error('SESSION_JWT_SECRET must be at least 32 bytes');
}

const SESSION_JWT = {
  ALGORITHM: 'HS256',
  ISSUER: 'velog-dashboard-api',
  AUDIENCE: 'velog-dashboard',
  CLOCK_TOLERANCE_SECONDS: 5,
} as const;

export const SESSION_COOKIE_NAME = 'vd_session';
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * 대시보드 자체 세션의 claims
 * @property sub users_user.id
 * @property uid velog uuid
 * @property ver users_user.session_version (로그아웃하면 올라가 이전 세션이 무효가 된다)
 */
export interface SessionClaims extends JwtPayload {
  sub: string;
  uid: string;
  ver: number;
  iat: number;
  exp: number;
}

export const signSession = (user: Pick<User, 'id' | 'velog_uuid' | 'session_version'>): string =>
  jwt.sign({ uid: user.velog_uuid, ver: user.session_version }, SECRET, {
    algorithm: SESSION_JWT.ALGORITHM,
    subject: String(user.id),
    issuer: SESSION_JWT.ISSUER,
    audience: SESSION_JWT.AUDIENCE,
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });

/**
 * 세션 토큰의 서명·만료·발급자를 검증합니다.
 * @returns 검증된 claims, 유효하지 않으면 null
 */
export const verifySession = (token: string): SessionClaims | null => {
  try {
    return jwt.verify(token, SECRET, {
      algorithms: [SESSION_JWT.ALGORITHM],
      issuer: SESSION_JWT.ISSUER,
      audience: SESSION_JWT.AUDIENCE,
      clockTolerance: SESSION_JWT.CLOCK_TOLERANCE_SECONDS,
    }) as SessionClaims;
  } catch {
    return null;
  }
};
