import axios from 'axios';
import dotenv from 'dotenv';

// 환경 변수 로드 (.env 파일)
dotenv.config();

// 테스트 환경에서 SLACK_WEBHOOK_URL이 설정되어 있지 않으면 기본값 설정
process.env.SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL || 'https://dummy-slack-webhook-url.com';

// axios 모듈을 mock 처리
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// 테스트 대상 모듈을 import 합니다.
// 주의: 모듈을 import하기 전에 process.env.SLACK_WEBHOOK_URL을 설정해야 합니다.
import { sendSlackMessage } from '@/modules/slack/slack.notifier';

describe('sendSlackMessage', () => {
  // 각 테스트 실행 전 mock 호출 기록 초기화
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('정상적인 메시지 전송 - axios.post가 올바른 파라미터로 호출되어야 한다', async () => {
    // Arrange: axios.post가 성공적으로 응답하도록 설정합니다.
    const fakeResponse = { data: 'ok' };
    mockedAxios.post.mockResolvedValue(fakeResponse);

    const testMessage = 'Test Slack message';

    // Act: sendSlackMessage 함수를 호출합니다.
    await sendSlackMessage(testMessage);

    // Assert: axios.post가 올바른 URL, payload, header로 호출되었는지 검증합니다.
    expect(mockedAxios.post).toHaveBeenCalledWith(
      process.env.SLACK_WEBHOOK_URL,
      { text: testMessage },
      { headers: { 'Content-Type': 'application/json' } }
    );
  });

  test('axios.post 호출 중 에러가 발생하면 sendSlackMessage가 예외를 throw 해야 한다', async () => {
    // Arrange: axios.post가 에러를 발생시키도록 설정합니다.
    const errorMessage = 'Network Error';
    mockedAxios.post.mockRejectedValue(new Error(errorMessage));

    // Act & Assert: sendSlackMessage 호출 시 에러가 발생하는지 확인합니다.
    await expect(sendSlackMessage('Test error')).rejects.toThrow(errorMessage);
  });
});
