'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LeftOutlined } from '@ant-design/icons';
import VipRechargePageBody from '@/app/vip-recharge/VipRechargePageBody';
import { safeBack } from '@/utils/navigation';
import { getSubscribeSeoCopy } from '@/utils/seoI18n';
import styles from './page.module.less';

function PCSubscribeContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [tabsNode, setTabsNode] = useState(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const nextTitle = getSubscribeSeoCopy(i18n.language).title;
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
    return undefined;
  }, [i18n.language]);

  return (
    <div className={styles.pcWrap}>
      <header className={styles.pcHeader}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => safeBack(router, { fallback: '/' })}
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
        fullWidthCards
        compactCards
      />
    </div>
  );
}

export default function SubscribePage() {
  return <PCSubscribeContent />;
}
