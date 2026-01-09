'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { resetSessionExpiredFlag } from '@/utils/request';

/**
 * 路由变化处理组件
 * 监听路由变化，重置会话过期提示标志
 */
export default function RouteChangeHandler() {
  const pathname = usePathname();

  useEffect(() => {
    // 路由变化时重置会话过期提示标志
    resetSessionExpiredFlag();
  }, [pathname]);

  return null;
}
