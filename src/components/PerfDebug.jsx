'use client';

import { useEffect } from 'react';

function isEnabled() {
  try {
    return (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('perfDebug') === '1'
    );
  } catch (_) {
    return false;
  }
}

export default function PerfDebug() {
  useEffect(() => {
    if (!isEnabled()) return;

    const t0 = performance.now();
    // eslint-disable-next-line no-console
    console.log('[perfDebug] enabled', {
      href: window.location.href,
      navType: performance.getEntriesByType?.('navigation')?.[0]?.type,
    });

    // Observe long tasks (main-thread blocking)
    let longTaskObserver = null;
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => {
          // eslint-disable-next-line no-console
          console.warn('[perfDebug][longtask]', {
            name: e.name,
            start: Math.round(e.startTime),
            duration: Math.round(e.duration),
          });
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (_) {}

    // Track LogoLoading show/hide (global blocker)
    const logLoadingState = (reason) => {
      const els = document.querySelectorAll?.('[data-perf="logo-loading"][data-fullscreen="1"]') || [];
      // eslint-disable-next-line no-console
      console.log('[perfDebug][logoLoading]', {
        reason,
        count: els.length,
        t: Math.round(performance.now() - t0) + 'ms',
      });
    };

    logLoadingState('mount');

    const mo = new MutationObserver(() => {
      logLoadingState('mutation');
    });
    try {
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (_) {}

    // Useful milestones
    const onLoad = () => {
      // eslint-disable-next-line no-console
      console.log('[perfDebug] window.load', { t: Math.round(performance.now() - t0) + 'ms' });
      logLoadingState('window.load');
    };
    window.addEventListener('load', onLoad, { once: true });

    return () => {
      window.removeEventListener('load', onLoad);
      try {
        mo.disconnect();
      } catch (_) {}
      try {
        longTaskObserver?.disconnect();
      } catch (_) {}
    };
  }, []);

  return null;
}

