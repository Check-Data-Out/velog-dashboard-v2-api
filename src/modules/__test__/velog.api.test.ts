import axios from 'axios';
import { fetchVelogApi } from '@/modules/velog/velog.api';
import { VELOG_API_URL, VELOG_QUERIES } from '@/modules/velog/velog.constans';

// axios 모킹
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// logger 모킹 (콘솔 출력 방지)
jest.mock('@/configs/logger.config', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Velog API', () => {
  const mockAccessToken = 'test-access-token';
  const mockRefreshToken = 'test-refresh-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchVelogApi', () => {
    it('유효한 토큰으로 사용자 정보를 성공적으로 가져와야 한다', async () => {
      // API 응답 모킹
      const mockResponse = {
        data: {
          data: {
            currentUser: {
              id: 'user-uuid',
              username: 'testuser',
              email: 'test@example.com',
              profile: {
                thumbnail: 'https://example.com/avatar.png'
              }
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await fetchVelogApi(mockAccessToken, mockRefreshToken);

      // 결과 검증
      expect(result).toEqual({
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
        profile: {
          thumbnail: 'https://example.com/avatar.png'
        }
      });

      // axios 호출 검증
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        VELOG_API_URL,
        { VELOG_QUERIES, variables: {} },
        {
          headers: {
            authority: 'v3.velog.io',
            origin: 'https://velog.io',
            'content-type': 'application/json',
            cookie: `access_token=${mockAccessToken}; refresh_token=${mockRefreshToken}`,
          },
        }
      );
    });

    it('이메일이 없는 사용자 정보도 성공적으로 처리해야 한다', async () => {
      // 이메일이 없는 API 응답 모킹
      const mockResponse = {
        data: {
          data: {
            currentUser: {
              id: 'user-uuid',
              username: 'testuser',
              // email 필드 없음
              profile: {
                thumbnail: 'https://example.com/avatar.png'
              }
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await fetchVelogApi(mockAccessToken, mockRefreshToken);

      // 결과 검증 - email이 null로 설정되었는지 확인
      expect(result).toEqual({
        id: 'user-uuid',
        username: 'testuser',
        email: null,
        profile: {
          thumbnail: 'https://example.com/avatar.png'
        }
      });
    });

    it('API 응답에 오류가 있으면 InvalidTokenError를 던져야 한다', async () => {
      // 오류가 포함된 API 응답 모킹
      const mockResponse = {
        data: {
          errors: [{ message: '인증 실패' }],
          data: { currentUser: null }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // 함수 호출 시 예외 발생 검증
      await expect(fetchVelogApi(mockAccessToken, mockRefreshToken))
        .rejects.toThrow(expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'Velog API 인증에 실패했습니다.'
        }));
    });

    it('currentUser가 null이면 InvalidTokenError를 던져야 한다', async () => {
      // currentUser가 null인 API 응답 모킹
      const mockResponse = {
        data: {
          data: {
            currentUser: null
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // 함수 호출 시 예외 발생 검증
      await expect(fetchVelogApi(mockAccessToken, mockRefreshToken))
        .rejects.toThrow(expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'Velog 사용자 정보를 가져오지 못했습니다.'
        }));

    });

    it('API 호출 자체가 실패하면 InvalidTokenError를 던져야 한다', async () => {
      // axios 호출 실패 모킹
      mockedAxios.post.mockRejectedValueOnce(new Error('네트워크 오류'));

      // 함수 호출 시 예외 발생 검증
      await expect(fetchVelogApi(mockAccessToken, mockRefreshToken))
        .rejects.toThrow(expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'Velog API 인증에 실패했습니다.'
        }));
    });
  });
});