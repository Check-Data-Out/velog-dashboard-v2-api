/* eslint-disable @typescript-eslint/naming-convention */
import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { VelogUserLoginResponse } from '../types/velog.type';
import logger from '../configs/logger.config';

// Request에 user 프로퍼티를 추가하기 위한 타입 확장

const VELOG_API_URL = 'https://v3.velog.io/graphql';
const QUERIES = {
  LOGIN: `query currentUser {
    currentUser {
      id
      username
      email
      profile {
        thumbnail
        }
      }
    }`,
};

/**
 * 요청에서 토큰을 추출하는 함수
 * @param req - Express Request 객체
 * @returns  추출된 토큰 객체
 * @description 다음 순서로 토큰을 확인합니다:
 * 1. 요청 본문 (req.body) - 신규 로그인
 * 2. 요청 헤더 - API 호출
 * 3. 쿠키 - 웹 클라이언트
 */
const extractTokens = (req: Request): { accessToken: string | undefined; refreshToken: string | undefined } => {
  const accessToken = req.body.accessToken || req.headers['access_token'] || req.cookies['access_token'];
  const refreshToken = req.body.refreshToken || req.headers['refresh_token'] || req.cookies['refresh_token'];

  return { accessToken, refreshToken };
};

/**
 * Velog API를 통해 사용자 정보를 조회합니다.
 * @param query - GraphQL 쿼리 문자열
 * @param accessToken - Velog access token
 * @throws {Error} API 호출 실패 시
 * @returns Promise<VelogUserLoginResponse | VelogUserVerifyResponse | null>
 */
const fetchVelogApi = async (query: string, accessToken: string): Promise<VelogUserLoginResponse | null> => {
  try {
    const response = await axios.post(
      VELOG_API_URL,
      { query, variables: {} },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const result = response.data;

    if (result.errors) {
      logger.error('GraphQL Errors:', result.errors);
      return null;
    }

    return result.data?.currentUser || null;
  } catch (error) {
    logger.error('Velog API 호출 중 오류:', error);
    return null;
  }
};

/**
 *  Bearer 토큰을 검증하고 Velog 사용자를 인증하는 함수
 * @param query - 사용자 정보를 조회할 GraphQL 쿼리
 * @returns
 */

export const verifyBearerTokens = (query: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { accessToken, refreshToken } = extractTokens(req);

      if (!accessToken || !refreshToken) {
        res.status(401).json({ message: 'access_token과 refresh_token은 필수값 입니다.' });
        return;
      }

      const velogUser = await fetchVelogApi(query, accessToken);

      if (!velogUser) {
        res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
        return;
      }

      req.user = velogUser;
      req.tokens = { accessToken, refreshToken };
      next();
    } catch (error) {
      logger.error('인증 처리중 오류가 발생하였습니다.', error);
      res.status(500).json({ message: '서버 오류로 인해 인증에 실패했습니다.' });
    }
  };
};
/**
 * Velog 사용자 인증을 위한 미들웨어 모음
 * @property {Function} login - 사용자의 전체 정보를 조회하는 인증 미들웨어
 * @property {Function} verify - 기본 사용자 정보만 조회하는 인증 미들웨어
 */
export const authMiddleware = {
  login: verifyBearerTokens(QUERIES.LOGIN),
};
