import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
if (!SECRET || Buffer.byteLength(SECRET) < 32) {
  throw new Error('NEWSLETTER_UNSUBSCRIBE_SECRET must be at least 32 bytes');
}

/** 뉴스레터 수신거부 링크 서명 키. back-office 와 같은 값이어야 한다. */
export const NEWSLETTER_UNSUBSCRIBE_SECRET: string = SECRET;
