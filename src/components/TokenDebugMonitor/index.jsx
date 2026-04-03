'use client';

import { useEffect } from 'react';

const previewToken = (token) => {
  if (typeof token !== 'string' || !token) return null;
  return `${token.slice(0, 10)}...${token.slice(-6)}`;
};

const classifyChange = ({ prev, next }) => {
  const hadPrev = typeof prev === 'string' && prev.length > 0;
  const hadNext = typeof next === 'string' && next.length > 0;

  if (!hadPrev && hadNext) return 'login';
  if (hadPrev && !hadNext) return 'logout';
  if (hadPrev && hadNext && prev !== next) return 'change';
  return 'no_change';
};

export default function TokenDebugMonitor() {
  // 调试开关：控制是否在控制台输出 token 变化
  // 设为 true 后可以恢复 [TokenDebug] 日志。
  const ENABLE_TOKEN_DEBUG = false;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ENABLE_TOKEN_DEBUG) return;

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);

    const log = (event, payload) => {
      // 单点输出，便于你在 console 里筛选
      console.warn('[TokenDebug]', event, payload);
    };

    const readToken = () => {
      try {
        const t = localStorage.getItem('token');
        return typeof t === 'string' ? t : null;
      } catch {
        return null;
      }
    };

    // 初始快照
    const initial = readToken();
    log('init', {
      hasToken: !!initial,
      token: previewToken(initial),
      ts: Date.now(),
    });

    localStorage.setItem = (key, value) => {
      const prev = key === 'token' ? readToken() : null;
      const next = key === 'token' ? String(value ?? '') : null;
      const ret = originalSetItem(key, value);

      if (key === 'token') {
        const kind = classifyChange({ prev, next });
        log('setItem', {
          kind, // login | logout | change | no_change
          prev: previewToken(prev),
          next: previewToken(next),
          same: prev === next,
          ts: Date.now(),
          stack: new Error().stack,
        });
      }

      return ret;
    };

    localStorage.removeItem = (key) => {
      const prev = key === 'token' ? readToken() : null;
      const ret = originalRemoveItem(key);
      if (key === 'token') {
        const next = readToken();
        const kind = classifyChange({ prev, next });
        log('removeItem', {
          kind,
          prev: previewToken(prev),
          next: previewToken(next),
          ts: Date.now(),
          stack: new Error().stack,
        });
      }
      return ret;
    };

    const onStorage = (e) => {
      if (e?.key !== 'token') return;
      const prev = typeof e.oldValue === 'string' ? e.oldValue : null;
      const next = typeof e.newValue === 'string' ? e.newValue : null;
      const kind = classifyChange({ prev, next });
      log('storage', {
        kind,
        prev: previewToken(prev),
        next: previewToken(next),
        same: prev === next,
        ts: Date.now(),
      });
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, []);

  return null;
}

