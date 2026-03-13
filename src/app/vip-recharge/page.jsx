'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';
import VipRechargeHeader from './components/VipRechargeHeader';
import VipRechargeTabs from './components/VipRechargeTabs';
import VipRechargePlanCards from './components/VipRechargePlanCards';
import { getVipRechargePlans } from './components/getVipRechargePlans';
import { getSubscriptionBenefits, getSubscriptionPricing } from '@/api/vip';

export default function VipRechargePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('monthly');

  const [benefitsRes, setBenefitsRes] = useState(null);
  const [pricingRes, setPricingRes] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(null);

  useEffect(() => {
    let alive = true;
    setRemoteLoading(true);
    setRemoteError(null);
    Promise.all([getSubscriptionBenefits(), getSubscriptionPricing()])
      .then(([b, p]) => {
        if (!alive) return;
        setBenefitsRes(b);
        setPricingRes(p);
      })
      .catch((e) => {
        if (!alive) return;
        // 静态数据兜底：接口失败只提示不阻塞页面
        setRemoteError(e || new Error('Failed to load subscription data'));
      })
      .finally(() => {
        if (!alive) return;
        setRemoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const planCardsData = useMemo(
    () => getVipRechargePlans({ benefitsRes, pricingRes }),
    [benefitsRes, pricingRes]
  );

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <VipRechargeHeader title={t('vipRecharge.title')} />

      <div className={styles.content}>
        {/* VipTabs Component - only for tab switching */}
        <VipRechargeTabs t={t} onChange={setActiveTab} />

        {/* Plan Cards Container - outside tabs */}
        <div className={styles.planCardsContainer} key={activeTab}>
          {remoteError && !remoteLoading && <div>Failed to load subscription data.</div>}
          <VipRechargePlanCards plans={planCardsData[activeTab] || []} />
        </div>
      </div>
    </div>
  );
}
