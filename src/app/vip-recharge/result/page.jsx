'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

// Custom Icons
const SuccessIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const FailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const ProcessingIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function RechargeResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  
  // Get status from URL, default to processing
  const statusParam = searchParams.get('status') || 'processing';
  const [status, setStatus] = useState(statusParam);
  
  // Mock validity date (today + 30 days)
  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + 30);
  const formattedDate = validityDate.toISOString().split('T')[0];

  useEffect(() => {
    // If in processing state, simulate a check after 2 seconds
    if (status === 'processing') {
      const timer = setTimeout(() => {
        // Here you would normally poll the backend
        // For demo, we switch to success
        setStatus('success');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handlePrimaryAction = () => {
    if (status === 'success') {
      router.push('/user'); // Go to profile to see new status
    } else {
      router.push('/vip-recharge'); // Retry
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'success':
        return {
          icon: <SuccessIcon className={`${styles.iconWrapper} ${styles.successIcon}`} />,
          title: t('vip.result.success.title'),
          desc: t('vip.result.success.desc'),
          btnText: t('vip.result.success.btn'),
          showInfo: true
        };
      case 'fail':
        return {
          icon: <FailIcon className={`${styles.iconWrapper} ${styles.failIcon}`} />,
          title: t('vip.result.fail.title'),
          desc: t('vip.result.fail.desc'),
          btnText: t('vip.result.fail.btn'),
          showInfo: false
        };
      case 'processing':
      default:
        return {
          icon: <ProcessingIcon className={`${styles.iconWrapper} ${styles.processingIcon}`} />,
          title: t('vip.result.processing.title'),
          desc: t('vip.result.processing.desc'),
          btnText: null, // No button while processing
          showInfo: false
        };
    }
  };

  const content = renderContent();

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        {content.icon}
      </div>
      
      <div className={styles.title}>{content.title}</div>
      <div className={styles.desc}>{content.desc}</div>

      {content.showInfo && (
        <div className={styles.infoCard}>
          <div className={styles.infoItem}>
            <span className={styles.label}>{t('vip.card.title')}</span>
            <span className={styles.value}>Mozi Pro</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>{t('vip.result.success.validity')}</span>
            <span className={styles.value}>{formattedDate}</span>
          </div>
        </div>
      )}

      {content.btnText && (
        <div 
          className={`${styles.actionBtn} ${status === 'fail' ? styles.secondaryBtn : ''}`}
          onClick={handlePrimaryAction}
        >
          {content.btnText}
        </div>
      )}
    </div>
  );
}
