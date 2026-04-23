'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';
import VipRechargeHeader from './components/VipRechargeHeader';
import VipRechargePageBody from './VipRechargePageBody';

export default function VipRechargePage() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <VipRechargeHeader title={t('vipRecharge.title')} />
      <VipRechargePageBody contentClassName={styles.content} planCardsClassName={styles.planCardsContainer} />
    </div>
  );
}
