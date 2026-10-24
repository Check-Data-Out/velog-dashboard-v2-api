import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

dotenv.config();

// SDK 기본 PII 차단 목록. dataCollection 을 지정하면 나머지 항목의 기본값이 "모두 수집"으로 바뀌므로 기본값을 그대로 적는다
const PII_DENY = ['forwarded', '-ip', 'remote-', 'via', '-user'];

// Sentry 초기화 상태 추적
let sentryInitialized = false;

export const initSentry = () => {
  try {
    if (!process.env.SENTRY_DSN) {
      sentryInitialized = false;
      return;
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      release: process.env.NODE_ENV,

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 0.1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
      enabled: true,

      // Capture 100% of the transactions for performance monitoring
      integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],

      // 세션 쿠키(vd_session)는 그대로 보내면 세션 탈취로 이어지므로 쿠키는 수집하지 않는다(헤더의 cookie 도 함께 빠진다).
      // 뉴스레터 수신거부 링크의 서명(sig)·이메일(email)은 만료되지 않으므로 URL 에 남기지 않는다
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: { deny: PII_DENY },
        httpBodies: [],
        urlQueryParams: { deny: [...PII_DENY, 'sig', 'email'] },
        genAI: { inputs: false, outputs: false },
        databaseQueryData: false,
      },
    });

    sentryInitialized = true;
  } catch (error) {
    sentryInitialized = false;
    throw error;
  }
};

// Sentry 상태 확인 함수
export const getSentryStatus = (): boolean => {
  return sentryInitialized;
};
