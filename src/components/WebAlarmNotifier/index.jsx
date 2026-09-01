'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notification } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { clearAlertConfigCache, fetchAlertConfig } from '@/hooks/useAlertConfig';
import { MOZI_SESSION_CHANGED, MOZI_TOKEN_UPDATED } from '@/utils/sessionEvents';
import { shouldEnableWebAlarmPush, useWebAlarmPush } from '@/hooks/useWebAlarmPush';

notification.config({
  placement: 'topRight',
  top: 72,
  duration: 5,
  maxCount: 3,
});

function readPushEnabled() {
  return shouldEnableWebAlarmPush();
}

export default function WebAlarmNotifier() {
  const { t } = useTranslation();
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(() => readPushEnabled());
  const [authToken, setAuthToken] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '')
  );
  const authRefreshRef = useRef(0);

  const syncPushEnabled = useCallback(() => {
    setPushEnabled(readPushEnabled());
  }, []);

  const refreshAuthAndReconnect = useCallback(async () => {
    const requestId = ++authRefreshRef.current;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';

    setAuthToken(token);

    if (!token) {
      clearAlertConfigCache();
      setPushEnabled(false);
      return;
    }

    // 先断开旧连接，避免换号后仍用上一用户的 token / 配置
    setPushEnabled(false);

    await fetchAlertConfig(true);
    if (requestId !== authRefreshRef.current) return;

    syncPushEnabled();
  }, [syncPushEnabled]);

  // PC 站启动 + 登录/登出：同步 token 与告警配置后决定是否建连
  useEffect(() => {
    refreshAuthAndReconnect();

    const onStorage = (e) => {
      if (!e.key || e.key === 'alertConfig' || e.key === 'token') {
        if (e.key === 'token') {
          refreshAuthAndReconnect();
          return;
        }
        syncPushEnabled();
      }
    };
    const onSessionChanged = () => refreshAuthAndReconnect();
    const onTokenUpdated = () => refreshAuthAndReconnect();
    const onWebAlarmConfigChanged = () => syncPushEnabled();

    window.addEventListener('storage', onStorage);
    window.addEventListener(MOZI_SESSION_CHANGED, onSessionChanged);
    window.addEventListener(MOZI_TOKEN_UPDATED, onTokenUpdated);
    window.addEventListener('mozi:webAlarmConfigChanged', onWebAlarmConfigChanged);

    return () => {
      authRefreshRef.current += 1;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MOZI_SESSION_CHANGED, onSessionChanged);
      window.removeEventListener(MOZI_TOKEN_UPDATED, onTokenUpdated);
      window.removeEventListener('mozi:webAlarmConfigChanged', onWebAlarmConfigChanged);
    };
  }, [refreshAuthAndReconnect, syncPushEnabled]);

  const handleAlert = useCallback(
    (event) => {
      const title = event.symbol
        ? t('oneClickAlarm.webAlarmTitle', {
            defaultValue: '{{symbol}} 告警',
            symbol: event.symbol,
          })
        : t('oneClickAlarm.webAlarm', { defaultValue: 'Web告警' });

      notification.info({
        message: title,
        description: event.text,
        onClick: () => {
          if (event.symbol) {
            router.push(`/pc/alarm?symbol=${encodeURIComponent(event.symbol)}`);
          }
        },
      });
    },
    [router, t]
  );

  useWebAlarmPush({ enabled: pushEnabled, authToken, onAlert: handleAlert });

  return null;
}
