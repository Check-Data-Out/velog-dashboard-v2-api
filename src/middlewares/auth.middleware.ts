import { NextFunction, Request, Response } from 'express';
import { isUUID } from 'class-validator';
import logger from '@/configs/logger.config';
import pool from '@/configs/db.config';
import { CustomError, DBError, InvalidTokenError } from '@/exception';
import { VelogJWTPayload, User } from '@/types';
import crypto from 'crypto';
import { isValidJwtFormat, safeExtractPayload } from '@/utils/jwt.util';
import { AuthRateLimitService } from '@/services/authRateLimit.service';

const LOCKOUT_SECONDS = 15 * 60; // 15분

// 전역 rate limit 서비스 (나중에 주입)
let globalRateLimitService: AuthRateLimitService | undefined;

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
 *  Bearer 토큰을 검증한뒤 user정보를 Request 객체에 담는 인가 함수
 *  @param rateLimitService - Rate limit 서비스 (선택적)
 */
const verifyBearerTokens = (rateLimitService?: AuthRateLimitService) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Rate Limit 체크 (서비스가 주입된 경우에만)
      if (rateLimitService) {
        try {
          const ip = req.ip || req.socket?.remoteAddress || 'unknown';
          const isBlocked = await rateLimitService.isIpBlocked(ip);
          if (isBlocked) {
            res.status(429).json({
              success: false,
              message: '너무 많은 인증 실패로 일시적으로 차단되었습니다.',
              retryAfter: LOCKOUT_SECONDS,
            });
            return;
          }
        } catch (error) {
          // fail-open: rate limit 에러 시에도 토큰 검증 계속 진행
          logger.error('Rate limit check failed', { error });
        }
      }

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
 * 인증 미들웨어 팩토리 함수
 * @param rateLimitService - Rate limit 서비스 (선택적)
 * @returns verify, verifySignature 미들웨어를 포함한 객체
 */
export const createAuthMiddleware = (rateLimitService?: AuthRateLimitService) => {
  return {
    verify: verifyBearerTokens(rateLimitService),
    verifySignature: verifySentrySignature(),
  };
};

/**
 * Rate limit 서비스를 전역으로 설정
 * app.ts에서 초기화 시 호출
 */
export const setRateLimitService = (service: AuthRateLimitService) => {
  globalRateLimitService = service;
};

/**
 * 사용자 인증을 위한 미들웨어 모음
 * 전역 rate limit 서비스가 설정되면 자동으로 rate limit 체크 수행
 * @property {Function} verify
 * @property {Function} verifySignature
 */
export const authMiddleware = {
  get verify() {
    return verifyBearerTokens(globalRateLimitService);
  },
  verifySignature: verifySentrySignature(),
};
