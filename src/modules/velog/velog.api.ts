import axios from 'axios';

import logger from '@/configs/logger.config';
import { InvalidTokenError } from '@/exception';
import { VELOG_API_URL, VELOG_QUERIES } from '@/modules/velog/velog.constans';
import { VelogUserCurrentResponse } from '@/types';

/**
 * Velog API를 통해 사용자 정보를 조회합니다.
 * @param accessToken - Velog access token
 * @param refreshToken - Velog refresh token
 * @throws {Error} API 호출 실패 시
 * @returns Promise<VelogUserLoginResponse | null>
 */
export const fetchVelogApi = async (accessToken: string, refreshToken: string): Promise<VelogUserCurrentResponse> => {
  try {
    const query = VELOG_QUERIES.LOGIN;
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

    if (!result.data.currentUser) {
      logger.error('Velog API 응답에 currentUser 정보가 없습니다.');
      throw new InvalidTokenError('Velog 사용자 정보를 가져오지 못했습니다.');
    }

    // email이 undefined인 경우 null로 변환
    const currentUser = result.data.currentUser;
    return {
      ...currentUser,
      email: currentUser.email ?? null
    };
  } catch (error) {
    // 이미 InvalidTokenError인 경우 그대로 다시 던지기
    if (error instanceof InvalidTokenError) {
      throw error;
    }

    logger.error('Velog API 호출 중 오류 : ', error);
    throw new InvalidTokenError('Velog API 인증에 실패했습니다.');
  }
};