'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LeftOutlined } from '@ant-design/icons';
import NavBar from '@/components/NavBar';
import WechatAlertDetailContent from '@/components/WechatAlertDetailContent';
import { safeBack } from '@/utils/navigation';
import { getPcAlarmHref } from '@/hooks/useNavigateToPcAlarm';
import styles from './page.module.less';

export default function WechatAlertPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPC, setIsPC] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      setIsPC(window.innerWidth >= 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handlePcBack = async () => {
    const href = await getPcAlarmHref('BTC');
    safeBack(router, { fallback: href });
  };

  return (
    <div className={`${styles.page} ${isPC ? styles.pagePc : ''}`}>
      {isPC ? (
        <header className={styles.pcHeader}>
          <button
            type="button"
            className={styles.pcBackBtn}
            onClick={() => {
              void handlePcBack();
            }}
            aria-label={t('common.back', { defaultValue: '返回' })}
          >
            <LeftOutlined />
          </button>
          <h1 className={styles.pcTitle}>{t('oneClickAlarm.wechatAlarm')}</h1>
        </header>
      ) : (
        <NavBar title={t('oneClickAlarm.wechatAlarm')} />
      )}
      <WechatAlertDetailContent isPc={isPC} />
    </div>
  );
}
