import * as Sentry from '@sentry/nextjs';

const isSentryEnabled = String(process.env.NEXT_PUBLIC_ENABLE_SENTRY || '').toLowerCase() === 'true';

if (isSentryEnabled) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0),
    replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 0.1),
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      Sentry.browserTracingIntegration(),
    ],
    tracePropagationTargets: ['localhost', /^\//, /moziinnovations\.com/, /railway\.app/],
    beforeSend(event) {
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
      return event;
    },
  });
}
