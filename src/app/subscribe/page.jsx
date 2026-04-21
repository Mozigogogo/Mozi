'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LeftOutlined } from '@ant-design/icons';
import PCLayout from '@/components/PCLayout';
import VipRechargePageBody from '@/app/vip-recharge/VipRechargePageBody';
import styles from './page.module.less';

function PCSubscribeContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tabsNode, setTabsNode] = useState(null);

  return (
    <div className={styles.pcWrap}>
      <header className={styles.pcHeader}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.back()}
            aria-label={t('common.back', { defaultValue: '返回' })}
          >
            <LeftOutlined />
          </button>
          <h1 className={styles.pcTitle}>{t('subscribe.title', { defaultValue: '我的订阅' })}</h1>
        </div>
        <div className={styles.headerTabs}>{tabsNode}</div>
      </header>
      <VipRechargePageBody
        contentClassName={styles.content}
        renderTabs={false}
        onTabsNode={setTabsNode}
        planCardsClassName={styles.planCardsContainer}
        preferredPurchaseMethod="ARBITRUM"
      />
    </div>
  );
}

export default function SubscribePage() {
  return (
    <PCLayout>
      <PCSubscribeContent />
    </PCLayout>
  );
}
