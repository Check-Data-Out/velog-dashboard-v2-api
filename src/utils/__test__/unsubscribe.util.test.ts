import { signUnsubscribe, verifyUnsubscribe } from '@/utils/unsubscribe.util';

// back-office 와 함께 쓰는 고정 벡터
const KEY = 'test-newsletter-unsubscribe-secret-0123456789';
const SIG_42 = 'PJT8snaX4RoJtPxS8SJBVracgxS_c0eIMiT9gFKdIKc';

describe('unsubscribe.util', () => {
  it('고정 벡터와 같은 패딩 없는 base64url 서명을 만들어야 한다', () => {
    expect(signUnsubscribe(KEY, 42)).toBe(SIG_42);
  });

  it('맞는 uid·서명이면 통과해야 한다', () => {
    expect(verifyUnsubscribe(KEY, '42', SIG_42)).toBe(true);
  });

  it('uid 를 바꾸면 실패해야 한다', () => {
    expect(verifyUnsubscribe(KEY, '43', SIG_42)).toBe(false);
  });

  it('다른 키로 만든 서명이면 실패해야 한다', () => {
    expect(verifyUnsubscribe(`${KEY}-other`, '42', SIG_42)).toBe(false);
  });

  it('길이가 다른 서명이면 예외 없이 false 여야 한다', () => {
    expect(verifyUnsubscribe(KEY, '42', SIG_42.slice(0, -1))).toBe(false);
    expect(verifyUnsubscribe(KEY, '42', '')).toBe(false);
  });
});
