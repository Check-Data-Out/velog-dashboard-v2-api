import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { isUUID } from 'class-validator';
import logger from '../configs/logger.config';
import pool from '../configs/db.config';
import { DBError, InvalidTokenError } from '../exception';
import { VELOG_API_URL, VELOG_QUERIES } from '../constants/velog.constans';

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
 * Velog API를 통해 사용자 정보를 조회합니다.
 * @param query - GraphQL 쿼리 문자열
 * @param accessToken - Velog access token
 * @throws {Error} API 호출 실패 시
 * @returns Promise<VelogUserLoginResponse | null>
 */
const fetchVelogApi = async (query: string, accessToken: string, refreshToken: string) => {
  try {
    const response = await axios.post(
      VELOG_API_URL,
      { query, variables: {} },
      {
        headers: {
          authority: 'v3.velog.io',
          origin: 'https://velog.io',
          'content-type': 'application/json',
          cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
        },
      },
    );

    const result = response.data;

    if (result.errors) {
      logger.error('GraphQL Errors : ', result.errors);
      throw new InvalidTokenError('Velog API 인증에 실패했습니다.');
    }

    return result.data.currentUser || null;
  } catch (error) {
    logger.error('Velog API 호출 중 오류 : ', error);
    throw new InvalidTokenError('Velog API 인증에 실패했습니다.');
  }
};
const extractPayload = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
/**
 *  Bearer 토큰을 검증한뒤 최초 로그인이라면 Velog 사용자를 인증을, 아니라면 기존 사용자를 인증하여 user정보를 Request 객체에 담는 함수
 * @param query - 사용자 정보를 조회할 GraphQL 쿼리
 * @returns
 */
const verifyBearerTokens = (query?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken } = extractTokens(req);

      if (!accessToken || !refreshToken) {
        throw new InvalidTokenError('accessToken과 refreshToken의 입력이 올바르지 않습니다');
      }

      let user = null;
      if (query) {
        user = await fetchVelogApi(query, accessToken, refreshToken);
        if (!user) {
          throw new InvalidTokenError('유효하지 않은 토큰입니다.');
        }
      } else {
        const payload = extractPayload(accessToken);
        if (!payload.user_id || !isUUID(payload.user_id)) {
          throw new InvalidTokenError('유효하지 않은 토큰 페이로드 입니다.');
        }

        user = (await pool.query('SELECT * FROM "users_user" WHERE velog_uuid = $1', [payload.user_id])).rows[0];
        if (!user) {
          throw new DBError('사용자를 찾을 수 없습니다.');
        }
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
 * 사용자 인증을 위한 미들웨어 모음
 * @property {Function} login - 최초 로그인 시 Velog API를 호출하는 인증 미들웨어
 *  @property {Function} verify - 기존 유저를 인증하는 미들웨어
 */
export const authMiddleware = {
  login: verifyBearerTokens(VELOG_QUERIES.LOGIN),
  verify: verifyBearerTokens(),
};
