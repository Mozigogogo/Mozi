'use client';

import { useEffect } from 'react';

export default function BuildFingerprint() {
  useEffect(() => {
    const sha =
      process.env.NEXT_PUBLIC_BUILD_SHA ||
      process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_GIT_SHA ||
      '';

    // 挂到 window，便于随时在控制台查看
    try {
      window.__BUILD_SHA = sha || 'unknown';
    } catch (_) {}

    // 只打一条高信号日志，方便定位线上是否命中最新 bundle
    // eslint-disable-next-line no-console
    console.log('[BUILD]', {
      sha: sha || 'unknown',
      appEnv: process.env.NEXT_PUBLIC_APP_ENV || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      time: new Date().toISOString(),
    });
  }, []);

  return null;
}

