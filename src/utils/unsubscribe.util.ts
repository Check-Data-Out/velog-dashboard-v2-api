import crypto from 'crypto';

/**
 * 뉴스레터 수신거부 링크의 서명. back-office 가 같은 키·같은 방식으로 만든다.
 * @returns 패딩 없는 base64url of HMAC-SHA256(secret, "newsletter-unsubscribe:<uid>")
 */
export const signUnsubscribe = (secret: string, uid: number | string): string =>
  crypto.createHmac('sha256', secret).update(`newsletter-unsubscribe:${uid}`).digest('base64url');

/**
 * 수신거부 링크의 서명이 uid 와 맞는지 확인한다. 길이가 다르면 timingSafeEqual 이 예외를 던지므로 먼저 거른다.
 */
export const verifyUnsubscribe = (secret: string, uid: number | string, sig: string): boolean => {
  const expected = Buffer.from(signUnsubscribe(secret, uid));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};
