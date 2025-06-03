import { NextFunction, Request, Response } from 'express';
import { isUUID } from 'class-validator';
import logger from '@/configs/logger.config';
import pool from '@/configs/db.config';
import { DBError, InvalidTokenError } from '@/exception';
import { VelogJWTPayload, User } from '@/types';

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

      const payload = extractPayload(accessToken);
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
 * 사용자 인증을 위한 미들웨어 모음
 * @property {Function} verify
 */
export const authMiddleware = {
  verify: verifyBearerTokens(),
};
