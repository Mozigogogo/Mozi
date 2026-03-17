import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';
import DeferredImg from './DeferredImg';

const ActionButtons = () => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className={styles.actionButtonsGrid}>
      <button className={styles.actionButton} onClick={() => router.push('/addwarn?symbol=BTC')}>
        <DeferredImg src="/point/alert_alarm.svg" alt="Alarm" width={24} height={24} />
        <div className={styles.actionButtonContent}>
          <span className={styles.actionButtonTitle}>{t('pointsDetail.addAlarm')}</span>
          <span className={styles.actionButtonSubtitle}>{t('pointsDetail.addAlarmSubtitle') || 'Add an alarm'}</span>
        </div>
      </button>
      <button className={styles.actionButton} onClick={() => router.push('/kyc')}>
        <DeferredImg src="/point/certification.png" alt="Cert" width={24} height={24} />
        <div className={styles.actionButtonContent}>
          <span className={styles.actionButtonTitle}>{t('pointsDetail.certification')}</span>
          <span className={styles.actionButtonSubtitle}>{t('pointsDetail.certificationSubtitle') || 'Certification'}</span>
        </div>
      </button>
    </div>
  );
};

export default ActionButtons;

