// 서명·암호화 키와 Slack 주소는 모듈을 불러올 때 검사하므로, 테스트 전용 값을 먼저 넣어 둔다(.env 없이도 단위 테스트가 돈다)
process.env.SESSION_JWT_SECRET ??= 'test-session-secret-0123456789abcdef';
process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ??= 'test-newsletter-unsubscribe-secret-0123456789';
process.env.SLACK_WEBHOOK_URL ??= 'https://hooks.slack.test/dummy';
for (let i = 0; i < 10; i++) process.env[`AES_KEY_${i}`] ??= String(i).repeat(32);
