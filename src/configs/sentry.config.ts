import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

dotenv.config();

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: 'production',

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    enabled: true,

    // Capture 100% of the transactions for performance monitoring
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
};