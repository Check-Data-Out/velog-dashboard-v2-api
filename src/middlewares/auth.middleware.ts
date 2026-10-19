import { NextFunction, Request, Response } from 'express';
import { isUUID } from 'class-validator';
import logger from '@/configs/logger.config';
import pool from '@/configs/db.config';
import { CustomError, InvalidTokenError, UnauthorizedError } from '@/exception';
import { VelogJWTPayload, User } from '@/types';
import crypto from 'crypto';
import { isValidJwtFormat, safeExtractPayload } from '@/utils/jwt.util';
import { AuthRateLimitService, AUTH_RATE_LIMIT_CONFIG } from '@/services/authRateLimit.service';
import { fetchVelogApi } from '@/modules/velog/velog.api';
import { cache } from '@/configs/cache.config';

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

const VELOG_OWNER_CACHE = {
  KEY_PREFIX: 'auth:velog:',
  CONFIRMED_TTL_SECONDS: 10 * 60,
  REJECTED_TTL_SECONDS: 60,
  // velog 가 거부한 토큰 쌍을 표시하는 값. 캐시 미스(null)와 구분된다 (확인된 경우에는 velog uuid 를 저장)
  REJECTED: '',
} as const;

// 캐시는 velog 호출을 줄이는 용도라 실패해도 인증을 막지 않는다 (fail-open)
const readOwnerCache = async (key: string): Promise<string | null> =>
  cache.get<string>(key).catch((error) => {
    logger.error('velog 확인 캐시 조회 실패', { error });
    return null;
  });

const writeOwnerCache = async (key: string, value: string, ttlSeconds: number): Promise<void> =>
  cache.set(key, value, ttlSeconds).catch((error) => {
    logger.error('velog 확인 캐시 저장 실패', { error });
  });

/**
 * velog 에 토큰 쌍의 주인(velog uuid)을 확인한다. 같은 토큰 쌍은 잠시 캐시해 velog 호출을 줄인다.
 */
const confirmVelogOwner = async (accessToken: string, refreshToken: string): Promise<string> => {
  const hash = crypto.createHash('sha256').update(`${accessToken}.${refreshToken}`).digest('hex');
  const key = `${VELOG_OWNER_CACHE.KEY_PREFIX}${hash}`;

  const cached = await readOwnerCache(key);
  // 같은 쌍의 반복은 대입 시도가 아니므로 인증 실패로 세지 않는다 (velog 가 거부한 첫 요청만 집계)
  if (cached === VELOG_OWNER_CACHE.REJECTED) throw new UnauthorizedError('Velog 사용자 정보를 가져오지 못했습니다.');
  if (cached) return cached;

  try {
    const velogUser = await fetchVelogApi(accessToken, refreshToken);
    await writeOwnerCache(key, velogUser.id, VELOG_OWNER_CACHE.CONFIRMED_TTL_SECONDS);
    return velogUser.id;
  } catch (error) {
    // velog 가 명시적으로 거부한 경우만 캐시한다. 장애(ServiceUnavailableError)는 다음 요청에서 다시 확인
    if (error instanceof InvalidTokenError) {
      await writeOwnerCache(key, VELOG_OWNER_CACHE.REJECTED, VELOG_OWNER_CACHE.REJECTED_TTL_SECONDS);
    }
    throw error;
  }
};

/**
 *  Bearer 토큰을 검증한뒤 user정보를 Request 객체에 담는 인가 함수
 *  @param rateLimitService - Rate limit 서비스 (선택적)
 */
export const verifyBearerTokens = (rateLimitService?: AuthRateLimitService) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Rate Limit 체크 (서비스가 주입된 경우에만)
      // 라우터는 앱이 전역 서비스를 설정하기 전에 미들웨어를 만들어 두므로, 전역 서비스는 요청 시점에 읽는다
      const limiter = rateLimitService ?? globalRateLimitService;
      if (limiter) {
        try {
          const ip = req.ip || req.socket?.remoteAddress || 'unknown';
          const isBlocked = await limiter.isIpBlocked(ip);
          if (isBlocked) {
            res.status(429).json({
              success: false,
              message: '너무 많은 인증 실패로 일시적으로 차단되었습니다.',
              retryAfter: AUTH_RATE_LIMIT_CONFIG.LOCKOUT_SECONDS,
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
        // 로그인하지 않은 요청이므로 인증 실패로 세지 않는다
        throw new UnauthorizedError('accessToken과 refreshToken의 입력이 올바르지 않습니다');
      }

      // Fail-Fast: JWT 형식 검증
      if (!isValidJwtFormat(accessToken) || !isValidJwtFormat(refreshToken)) {
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
      // 가입 전 사용자(익스텐션 등)는 거부하되 IP 인증 실패로 집계하지 않는다
      if (!user) throw new UnauthorizedError('사용자를 찾을 수 없습니다.');

      // 토큰 주인은 velog 에서 확인한다
      const velogUuid = await confirmVelogOwner(accessToken, refreshToken);
      if (velogUuid !== payload.user_id) {
        throw new InvalidTokenError('토큰 사용자 정보가 일치하지 않습니다.');
      }

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
 * Rate limit 서비스를 전역으로 설정
 * app.ts에서 초기화 시 호출
 */
export const setRateLimitService = (service: AuthRateLimitService) => {
  globalRateLimitService = service;
};

/**
 * 사용자 인증을 위한 미들웨어 모음
 * 전역 rate limit 서비스가 설정되면 요청마다 rate limit 체크 수행
 * @property {Function} verify
 * @property {Function} verifySignature
 */
export const authMiddleware = {
  verify: verifyBearerTokens(),
  verifySignature: verifySentrySignature(),
};
