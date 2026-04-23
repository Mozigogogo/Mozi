'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function isEnabled() {
  try {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('wcdebug') === '1';
  } catch (_) {
    return false;
  }
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (_) {
    return String(obj);
  }
}

export default function TgWcWebviewCheck() {
  const enabled = useMemo(() => isEnabled(), []);
  const [lines, setLines] = useState(() => (enabled ? ['WC TG WebView check:'] : []));
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const log = (s) => setLines((prev) => [...prev, String(s)]);

    const tg = window.Telegram?.WebApp;
    log(`Telegram.WebApp: ${tg ? 'YES' : 'NO'}`);
    log(`openLink: ${typeof tg?.openLink === 'function' ? 'YES' : 'NO'}`);
    log(`href: ${window.location.href}`);
    log(`ua: ${navigator.userAgent}`);

    let hiddenCount = 0;
    const onVis = () => {
      log(`visibilitychange -> ${document.visibilityState}`);
      if (document.visibilityState === 'hidden') hiddenCount += 1;
    };
    const onBlur = () => log('window blur');
    const onFocus = () => log('window focus');
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    const open = (url) => {
      log('');
      log(`OPEN -> ${url}`);
      try {
        if (tg?.openLink) tg.openLink(url);
        else window.open(url, '_blank');
      } catch (e) {
        log(`OPEN_THROW -> ${safeStringify({ message: e?.message, name: e?.name })}`);
      }
    };

    const t1 = window.setTimeout(() => open('https://example.com'), 300);
    const t2 = window.setTimeout(() => open('wc:TEST_SCHEME_BLOCK_CHECK'), 2500);
    const t3 = window.setTimeout(() => {
      if (hiddenCount === 0) {
        log('');
        log('RESULT: 页面从未 hidden（很可能 TG WebView 没允许外部跳转 / wc: 被挡）');
      } else {
        log('');
        log('RESULT: 页面出现 hidden（说明至少发生过切后台/跳转行为）');
      }
    }, 6000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 99999,
        maxWidth: '78vw',
        maxHeight: '70vh',
        overflow: 'auto',
        background: 'rgba(0,0,0,.85)',
        color: '#00ff66',
        font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        padding: 10,
        borderRadius: 8,
        whiteSpace: 'pre-wrap',
        WebkitUserSelect: 'text',
        userSelect: 'text',
      }}
    >
      {lines.join('\n')}
    </div>
  );
}

