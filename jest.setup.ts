// 서명 키는 모듈을 불러올 때 검사하므로, 테스트 전용 값을 먼저 넣어 둔다
process.env.SESSION_JWT_SECRET ??= 'test-session-secret-0123456789abcdef';
process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ??= 'test-newsletter-unsubscribe-secret-0123456789';
