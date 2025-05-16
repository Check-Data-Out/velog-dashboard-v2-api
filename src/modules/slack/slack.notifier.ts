import axios from 'axios';
import dotenv from 'dotenv';

// 환경 변수 로드 (.env 파일)
dotenv.config();

// 환경 변수 체크
if (!process.env.SLACK_WEBHOOK_URL) {
  throw new Error('SLACK_WEBHOOK_URL is not defined in environment variables.');
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const SLACK_WEBHOOK_URL: string = process.env.SLACK_WEBHOOK_URL;

interface SlackPayload {
  text: string;
}

/**
 * Slack으로 메시지를 전송합니다.
 * @param message 전송할 메시지 텍스트
 */
export async function sendSlackMessage(message: string): Promise<void> {
  const payload: SlackPayload = { text: message };
  await axios.post(SLACK_WEBHOOK_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
}