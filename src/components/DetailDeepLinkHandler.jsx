'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

const TG_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';
const SYMBOL_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
const ALERT_STARTAPP_RE = /^alert_([A-Za-z0-9_-]+)$/;
const DEBUG_PREFIX = '[Mozi/TG DetailDeepLink]';

function log(...args) {
  // 调试：在 Telegram WebView 里用 Eruda/VConsole 看控制台；上线后可删或改 localStorage
  // eslint-disable-next-line no-console
  console.warn(DEBUG_PREFIX, ...args);
}

function getStartParamFromWebApp(tg) {
  if (!tg) return '';
  if (typeof tg.startParam === 'string' && tg.startParam) return tg.startParam;
  const unsafe = tg.initDataUnsafe || {};
  if (typeof unsafe.start_param === 'string' && unsafe.start_param) return unsafe.start_param;
  return '';
}

function parseStartParamFromHash() {
  if (typeof window === 'undefined') return '';
  try {
    const h = window.location.hash || '';
    const m = h.match(/tgWebAppStartParam=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {
    /* ignore */
  }
  return '';
}

function ensureTelegramScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Telegram?.WebApp) return Promise.resolve(true);
  const existing = document.querySelector(`script[src="${TG_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => {
      const deadline = Date.now() + 8000;
      const tick = () => {
        if (window.Telegram?.WebApp) {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          resolve(false);
          return;
        }
        setTimeout(tick, 30);
      };
      tick();
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = TG_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(!!window.Telegram?.WebApp);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * 1) URL 带 symbol + from=tg_alert → 非 /detail 时 replace 进详情
 * 2) 机器人「设置告警」走 t.me?startapp=alert_BTC 时，参数在 Telegram.WebApp.startParam，不在 URL，需单独解析
 */
export default function DetailDeepLinkHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const startappHandledRef = useRef(false);

  // A) 查询串（直连 /detail?... 或首页误带参）
  useEffect(() => {
    const from = searchParams.get('from');
    const raw = searchParams.get('symbol');
    log('query check', {
      pathname,
      from,
      symbol: raw,
      href: typeof window !== 'undefined' ? window.location.href : '(ssr)',
    });

    if (from !== 'tg_alert') {
      log('query skip: from !== tg_alert');
      return;
    }
    if (!raw || !SYMBOL_RE.test(raw.trim())) {
      log('query skip: symbol missing or invalid');
      return;
    }

    const symbol = raw.trim().toUpperCase();
    if (pathname === '/detail' || pathname?.startsWith('/detail/')) {
      log('query skip: already on /detail');
      return;
    }

    const qs = new URLSearchParams();
    qs.set('symbol', symbol);
    qs.set('from', 'tg_alert');
    const target = `/detail?${qs.toString()}`;
    log('query → router.replace', target);
    router.replace(target);
  }, [pathname, searchParams, router]);

  // B) Telegram startapp=alert_XXX（地址栏通常没有 ?symbol）
  useEffect(() => {
    if (pathname === '/detail' || pathname?.startsWith('/detail/')) {
      log('startapp skip: already on /detail');
      return;
    }
    if (startappHandledRef.current) return;

    let cancelled = false;

    const run = async () => {
      log('startapp check begin', {
        pathname,
        href: typeof window !== 'undefined' ? window.location.href : '',
      });

      let raw = parseStartParamFromHash();
      log('startParam from hash', raw || '(empty)');

      if (!raw) {
        const ok = await ensureTelegramScript();
        log('ensureTelegramScript', ok);
        if (cancelled) return;
        if (!ok) {
          log('startapp abort: Telegram WebApp SDK not available');
          return;
        }
        try {
          window.Telegram?.WebApp?.ready?.();
        } catch {
          /* ignore */
        }
        raw = getStartParamFromWebApp(window.Telegram?.WebApp);
        log('startParam from WebApp', raw || '(empty)', {
          startParam: window.Telegram?.WebApp?.startParam,
          initDataUnsafe: window.Telegram?.WebApp?.initDataUnsafe?.start_param,
        });
      }

      if (!raw) {
        log('startapp skip: no startParam (若点了机器人按钮仍如此，说明未在 Mini App 内或未注入 SDK)');
        return;
      }

      const m = raw.match(ALERT_STARTAPP_RE);
      if (!m) {
        log('startapp skip: not alert_* pattern', raw);
        return;
      }

      startappHandledRef.current = true;
      const symbol = m[1].toUpperCase();
      const target = `/detail?symbol=${encodeURIComponent(symbol)}&from=tg_alert`;
      log('startapp → router.replace', target);
      router.replace(target);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
