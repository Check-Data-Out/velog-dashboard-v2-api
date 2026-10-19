import axios, { AxiosError } from 'axios';

import logger from '@/configs/logger.config';
import { InvalidTokenError, ServiceUnavailableError } from '@/exception';
import { VELOG_API_URL, VELOG_QUERIES } from '@/modules/velog/velog.constans';
import { VelogUserCurrentResponse } from '@/types';

const VELOG_TIMEOUT_MS = 2000;

/**
 * Velog API를 통해 사용자 정보를 조회합니다.
 * @param accessToken - Velog access token
 * @param refreshToken - Velog refresh token
 * @throws {InvalidTokenError} velog 가 토큰 주인을 돌려주지 않을 때
 * @throws {ServiceUnavailableError} velog 연결 실패·타임아웃·5xx·429·GraphQL 오류일 때
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
        timeout: VELOG_TIMEOUT_MS,
      },
    );

    const result = response.data;

    // 토큰이 무효하면 velog 는 오류 없이 currentUser 를 null 로 준다. 오류는 velog 쪽 문제로 본다
    if (result.errors) {
      logger.error('GraphQL Errors : ', result.errors);
      throw new ServiceUnavailableError('Velog API 응답에 오류가 있습니다.');
    }

    if (!result.data.currentUser) {
      logger.error('Velog API 응답에 currentUser 정보가 없습니다.');
      throw new InvalidTokenError('Velog 사용자 정보를 가져오지 못했습니다.');
    }

    // email이 undefined인 경우 null로 변환
    const currentUser = result.data.currentUser;
    return {
      ...currentUser,
      email: currentUser.email ?? null,
    };
  } catch (error) {
    if (error instanceof InvalidTokenError || error instanceof ServiceUnavailableError) {
      throw error;
    }

    logger.error('Velog API 호출 중 오류 : ', error);

    // 연결 실패·타임아웃·5xx·429 는 토큰 문제가 아니므로 인증 실패로 다루지 않는다
    const status = (error as AxiosError).response?.status;
    if (status && status < 500 && status !== 429) {
      throw new InvalidTokenError('Velog API 인증에 실패했습니다.');
    }
    throw new ServiceUnavailableError('Velog API 를 호출할 수 없습니다.');
  }
};
