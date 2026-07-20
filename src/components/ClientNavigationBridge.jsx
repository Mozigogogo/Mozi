'use client';

import { startTransition, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CLIENT_NAVIGATE_EVENT } from '@/utils/clientNavigation';

/** 全局客户端路由桥：统一处理 navigateTo / jump2*，避免整页刷新白屏 */
export default function ClientNavigationBridge() {
  const router = useRouter();
  const routerRef = useRef(router);

  routerRef.current = router;

  useLayoutEffect(() => {
    const onNavigate = (event) => {
      const detail = event?.detail;
      const url = detail?.url;
      if (!url) return;

      detail?.setHandled?.();

      try {
        routerRef.current.prefetch?.(url);
      } catch (_) {}

      startTransition(() => {
        if (detail.replace) {
          routerRef.current.replace(url);
        } else {
          routerRef.current.push(url);
        }
      });
    };

    window.addEventListener(CLIENT_NAVIGATE_EVENT, onNavigate);
    return () => window.removeEventListener(CLIENT_NAVIGATE_EVENT, onNavigate);
  }, []);

  return null;
}
