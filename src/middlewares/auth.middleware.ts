import { NextFunction, Request, Response } from 'express';
import { isUUID } from 'class-validator';
import logger from '@/configs/logger.config';
import pool from '@/configs/db.config';
import { CustomError, DBError, InvalidTokenError } from '@/exception';
import { VelogJWTPayload, User } from '@/types';
import crypto from 'crypto';
import { isValidJwtFormat, safeExtractPayload } from '@/utils/jwt.util';

/**
 * 요청에서 토큰을 추출하는 함수
 * @param req - Express Request 객체
 * @returns  추출된 토큰 객체
 * @description 다음 순서로 토큰을 확인합니다:
 * 1. 요청 본문 (req.body) - 신규 로그인
 * 2. 요청 헤더 - API 호출
 * 3. 쿠키 - 웹 클라이언트
 */
const extractTokens = (req: Request): { accessToken: string; refreshToken: string } => {
  const accessToken = req.cookies['access_token'] || req.body.accessToken || req.headers['access_token'];
  const refreshToken = req.cookies['refresh_token'] || req.body.refreshToken || req.headers['refresh_token'];

  return { accessToken, refreshToken };
};

/**
 * JWT 토큰에서 페이로드를 추출하고 디코딩하는 함수
 * 이건 진짜 velog 에서 사용하는 걸 그대로 가져온 함수임!
 * @param token - 디코딩할 JWT 토큰 문자열
 * @returns {VelogJWTPayload}
 * @throws {Error} 토큰이 잘못되었거나 디코딩할 수 없는 경우
 * @example
 * const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
 * const payload = extractPayload(token);
 * // 반환값: { sub: "1234567890" }
 */
const extractPayload = (token: string): VelogJWTPayload =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

/**
 *  Bearer 토큰을 검증한뒤 user정보를 Request 객체에 담는 인가 함수
 */
const verifyBearerTokens = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken } = extractTokens(req);

      if (!accessToken || !refreshToken) {
        throw new InvalidTokenError('accessToken과 refreshToken의 입력이 올바르지 않습니다');
      }

      // Fail-Fast: JWT 형식 검증
      if (!isValidJwtFormat(accessToken)) {
        throw new InvalidTokenError('유효하지 않은 JWT 형식입니다.');
      }

      // 안전한 페이로드 추출 (JSON 파싱 실패 시 null 반환)
      const payload = safeExtractPayload<VelogJWTPayload>(accessToken);
      if (!payload) {
        throw new InvalidTokenError('토큰 페이로드를 추출할 수 없습니다.');
      }

      if (!payload.user_id || !isUUID(payload.user_id)) {
        throw new InvalidTokenError('유효하지 않은 토큰 페이로드 입니다.');
      }

      const user = (await pool.query('SELECT * FROM "users_user" WHERE velog_uuid = $1', [payload.user_id]))
        .rows[0] as User;
      if (!user) throw new DBError('사용자를 찾을 수 없습니다.');

      req.user = user;
      req.tokens = { accessToken, refreshToken };
      next();
    } catch (error) {
      logger.error('인증 처리중 오류가 발생하였습니다. : ', error);
      next(error);
    }
  };
};

/**
 * Sentry 웹훅 요청의 시그니처 헤더를 검증합니다.
 * HMAC SHA256과 Sentry의 Client Secret를 사용하여 요청 본문을 해시화하고,
 * Sentry에서 제공하는 시그니처 헤더와 비교하여 요청의 무결성을 확인합니다.
 */
function verifySentrySignature() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!process.env.SENTRY_CLIENT_SECRET) throw new Error('SENTRY_CLIENT_SECRET가 env에 없습니다');

      const hmac = crypto.createHmac('sha256', process.env.SENTRY_CLIENT_SECRET);

      // Raw body 사용 - Express에서 파싱되기 전의 원본 데이터 필요
      // req.rawBody가 없다면 fallback으로 JSON.stringify 사용 (완벽하지 않음)
      // @ts-expect-error - rawBody는 커스텀 미들웨어에서 추가되는 속성
      const bodyToVerify = req.rawBody || JSON.stringify(req.body);
      const sentrySignature = req.headers['sentry-hook-signature'];

      if (!bodyToVerify) throw new Error('요청 본문이 없습니다.');
      if (!sentrySignature) throw new Error('시그니처 헤더가 없습니다.');

      hmac.update(bodyToVerify, 'utf8');
      const digest = hmac.digest('hex');

      if (digest !== sentrySignature)
        throw new CustomError('유효하지 않은 시그니처 헤더입니다.', 'INVALID_SIGNATURE', 400);

      next();
    } catch (error) {
      logger.error('시그니처 검증 중 오류가 발생하였습니다. : ', error);
      next(error);
    }
  };
}

/**
 * 사용자 인증을 위한 미들웨어 모음
 * @property {Function} verify
 * * @property {Function} verifySignature
 */
export const authMiddleware = {
  verify: verifyBearerTokens(),
  verifySignature: verifySentrySignature(),
};
