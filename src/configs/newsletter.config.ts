import dotenv from 'dotenv';
import logger from '@/configs/logger.config';

dotenv.config();

const MIN_SECRET_BYTES = 32;

/**
 * 뉴스레터 수신거부 링크 서명 키. back-office 와 같은 값이어야 한다.
 * 없거나 32바이트 미만이면 undefined 를 돌려준다. 서버는 그대로 뜨고 서명 링크 수신거부만 처리하지 않는다.
 */
export const getNewsletterUnsubscribeSecret = (): string | undefined => {
  const secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
  return secret && Buffer.byteLength(secret) >= MIN_SECRET_BYTES ? secret : undefined;
};

if (!getNewsletterUnsubscribeSecret()) {
  logger.warn('NEWSLETTER_UNSUBSCRIBE_SECRET 이 없거나 32바이트 미만이라 서명 링크 수신거부를 처리하지 않습니다.');
}
