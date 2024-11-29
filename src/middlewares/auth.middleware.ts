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
 * 토큰 추출 함수
 * 1. 신규 유저 - body 에서 추출
 * 2. 기존 유저 - header와 cookie에서 추출 후 반환
 */
const extractTokens = (req: CustomRequest): { accessToken: string | undefined; refreshToken: string | undefined } => {
  let { accessToken, refreshToken } = req.body;

  if (!accessToken || !refreshToken) {
    accessToken = req.headers['access_token'];
    refreshToken = req.headers['refresh_token'];
  }

  if (!accessToken || !refreshToken) {
    accessToken = req.cookies['access_token'];
    refreshToken = req.cookies['refresh_token'];
  }

  return { accessToken, refreshToken };
};

// Velog GraphQL API 호출 함수
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
 * Velog API 호출
 * 1. extractTokens로 요청 (토큰 추출)
 * 2. 추출 후 velog API 호출 후 검증
 * 3. 사용자 정보 반환
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
