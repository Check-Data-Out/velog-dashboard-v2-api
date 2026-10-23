import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

dotenv.config();

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
      // 세션 쿠키(vd_session)를 그대로 보내면 세션 탈취로 이어지므로 쿠키는 수집하지 않는다(헤더의 cookie 도 함께 빠진다)
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        Sentry.requestDataIntegration({ include: { cookies: false } }),
      ],
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
