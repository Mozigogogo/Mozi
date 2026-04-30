import * as Sentry from '@sentry/nextjs';

const isSentryEnabled = String(process.env.NEXT_PUBLIC_ENABLE_SENTRY || '').toLowerCase() === 'true';

if (isSentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    beforeSend(event) {
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
      return event;
    },
  });
}
