'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    const isSentryEnabled = String(process.env.NEXT_PUBLIC_ENABLE_SENTRY || '').toLowerCase() === 'true';
    if (isSentryEnabled) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ marginBottom: 16, color: '#475569' }}>
            The error has been reported. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '10px 18px',
              background: '#11B787',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
