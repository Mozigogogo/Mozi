'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 不触发 Suspense 的 search 读取（避免 PC 壳 Fallback↔真壳 整树替换闪白）。
 * 覆盖 pathname 变化、popstate，以及同 path 仅改 query 的 pushState/replaceState。
 */
export function useClientSearchParams() {
  const pathname = usePathname();
  const [params, setParams] = useState(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setParams(new URLSearchParams(window.location.search));
      } catch {
        setParams(new URLSearchParams());
      }
    };

    sync();

    const wrapHistory = (method) => {
      const original = history[method];
      history[method] = function patched(...args) {
        const result = original.apply(this, args);
        queueMicrotask(sync);
        return result;
      };
      return original;
    };

    const originalPush = wrapHistory('pushState');
    const originalReplace = wrapHistory('replaceState');
    window.addEventListener('popstate', sync);

    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener('popstate', sync);
    };
  }, [pathname]);

  return params;
}
