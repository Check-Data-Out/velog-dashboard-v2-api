import { NextFunction, Request, Response } from 'express';
import axios from 'axios';

interface VelogUser {
  id: string;
  username: string;
  email: string;
  profile: {
    id: string;
    thumbnail: string;
    display_name: string;
    short_bio: string;
    profile_links: Record<string, string>;
  };
  user_meta: {
    id: string;
    email_notification: boolean;
    email_promotion: boolean;
  };
}

// Request에 user 프로퍼티를 추가하기 위한 타입 확장
export interface CustomRequest extends Request {
  user?: VelogUser;
}

/**
 * authmiddleware의 역할
 * 1. Velog API 호출 전 간단한 Bearer 검증
 * 2. Velog API 호출
 * 3. 무사히 응답이 되었다면 next로 엔드포인트 진입
 */

/**
 * 요청에서 토큰을 추출하는 함수
 * @param {CustomRequest} req - req에 user 프로퍼티를 추가한 Express 객체
 * @returns {string | null, string | null} accessToken 및 refreshToken 객체 반환
 * @description 다음과 같은 순서로 토큰을 확인합니다
 * 1. 요청 본문 - 신규 유저인 경우
 * 2. 요청 헤더 - 기존 유저인 경우
 * 3. 요청 쿠키 - 기존 유저인 경우
 */
const extractTokens = (req: CustomRequest): { accessToken: string | undefined; refreshToken: string | undefined } => {
  const accessToken = req.body.accessToken || req.headers['access_token'] || req.cookies['access_token'];
  const refreshToken = req.body.refreshToken || req.headers['refresh_token'] || req.cookies['refresh_token'];

  return { accessToken, refreshToken };
};

/**
 * Velog GraphQL API를 호출하여 액세스 토큰을 검증하는 함수
 * @param {string} accessToken - Velog Api 검증에 사용할 Access Token
 * @returns {Promise<VelogUser | null>} 검증 성공 시 사용자 데이터, 실패 시 null 반환
 */
const verifyVelogToken = async (accessToken: string): Promise<VelogUser | null> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const VELOG_API_URL = 'https://v3.velog.io/graphql';
  const query = `
    query currentUser {
      currentUser {
        id
        username
        email
        profile {
          id
          thumbnail
          display_name
          short_bio
          profile_links
        }
        user_meta {
          id
          email_notification
          email_promotion
        }
      }
    }
  `;

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
      console.error('GraphQL Errors:', result.errors);
      return null;
    }

    return result.data?.currentUser || null;
  } catch (error) {
    console.error('Velog API 호출 중 오류:', error);
    return null;
  }
};

/**
 * Bearer 토큰을 검증하고 Velog 사용자를 인증하는 미들웨어
 * @param {CustomRequest} req - req에 user 프로퍼티를 추가한 Express 객체
 * @param {Response} res - 응답 객체
 * @param {NextFunction} next - 다음 미들 웨어 화출 함수
 * @returns {Promise<void>}
 * @description
 * 인증 처리 과정:
 * 1. 요청에서 액세스 토큰과 리프레시 토큰 추출
 * 2. Velog API를 통해 토큰 유효성 검증
 * 3. 검증 성공 시 요청 객체에 사용자 정보 첨부
 * 4. 토큰이 유효하지 않거나 누락된 경우 에러 응답 반환
 *
 * @throws {Error} 토큰 검증 실패 시 에러 발생
 */
export const verifyBearerTokens = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. 토큰 추출
    const { accessToken, refreshToken } = extractTokens(req);
    if (!accessToken || !refreshToken) {
      res.status(401).json({ message: 'access_token과 refresh_token은 필수값 입니다.' });
      return;
    }

    // 2. Velog API를 통한 토큰 검증
    const velogUser = await verifyVelogToken(accessToken);
    if (!velogUser) {
      res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      return;
    }

    // 3. 사용자 정보를 객체에 추가
    req.user = velogUser;

    next();
  } catch (error) {
    console.error('토큰 검증 중 오류 발생:', error);
    res.status(500).json({ message: '서버 오류로 인해 토큰 검증에 실패했습니다.' });
  }
};
