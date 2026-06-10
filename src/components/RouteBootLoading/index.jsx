'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogoLoading } from '@/components/Loading';
import {
  ROUTE_BOOT_LOGO,
  ROUTE_BOOT_READY_EVENT,
  ROUTE_BOOT_START_EVENT,
  clearRouteBootLoading,
  pathMatchesBootTarget,
  peekRouteBootLoading,
} from '@/utils/routeBootLoading';

const BOOT_LOADING_TIMEOUT_MS = 10000;

export default function RouteBootLoading() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const syncVisible = useCallback(() => {
    const target = peekRouteBootLoading();
    if (!target) {
      setVisible(false);
      return;
    }
    setVisible(pathMatchesBootTarget(pathname, target));
  }, [pathname]);

  useEffect(() => {
    syncVisible();
  }, [syncVisible]);

  useEffect(() => {
    const hide = () => {
      clearRouteBootLoading();
      setVisible(false);
    };

    window.addEventListener(ROUTE_BOOT_START_EVENT, syncVisible);
    window.addEventListener(ROUTE_BOOT_READY_EVENT, hide);
    return () => {
      window.removeEventListener(ROUTE_BOOT_START_EVENT, syncVisible);
      window.removeEventListener(ROUTE_BOOT_READY_EVENT, hide);
    };
  }, [syncVisible]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setTimeout(() => {
      clearRouteBootLoading();
      setVisible(false);
    }, BOOT_LOADING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <LogoLoading visible={visible} fullscreen mask image={ROUTE_BOOT_LOGO} size={72} />
  );
}
