'use client';

import React from 'react';
import NavBar from '@/components/NavBar';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

export default function VipRechargePage() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <NavBar
        title={t('vip.title') || '会员充值'}
        backgroundColor="transparent"
        showBorder={false}
        fixed={false}
        color="white"
      />
    </div>
  );
}
