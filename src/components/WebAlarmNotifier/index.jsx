'use client';

import { useCallback, useEffect, useState } from 'react';
import { notification } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MOZI_SESSION_CHANGED } from '@/utils/sessionEvents';
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
  const [pushEnabled, setPushEnabled] = useState(false);

  const syncPushEnabled = useCallback(() => {
    setPushEnabled(readPushEnabled());
  }, []);

  useEffect(() => {
    syncPushEnabled();
    const onStorage = (e) => {
      if (!e.key || e.key === 'alertConfig' || e.key === 'token') {
        syncPushEnabled();
      }
    };
    const onSessionChanged = () => syncPushEnabled();
    const onWebAlarmConfigChanged = () => syncPushEnabled();
    window.addEventListener('storage', onStorage);
    window.addEventListener(MOZI_SESSION_CHANGED, onSessionChanged);
    window.addEventListener('mozi:webAlarmConfigChanged', onWebAlarmConfigChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MOZI_SESSION_CHANGED, onSessionChanged);
      window.removeEventListener('mozi:webAlarmConfigChanged', onWebAlarmConfigChanged);
    };
  }, [syncPushEnabled]);

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
        description: event.message,
        onClick: () => {
          if (event.symbol) {
            router.push(`/pc/alarm?symbol=${encodeURIComponent(event.symbol)}`);
          }
        },
      });
    },
    [router, t]
  );

  useWebAlarmPush({ enabled: pushEnabled, onAlert: handleAlert });

  return null;
}
