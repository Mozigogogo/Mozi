'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';
import VipRechargeHeader from './components/VipRechargeHeader';
import VipRechargeTabs from './components/VipRechargeTabs';
import VipRechargePlanCards from './components/VipRechargePlanCards';
import { getVipRechargePlans } from './components/getVipRechargePlans';
import { startVipPurchase } from './utils/startVipPurchase';
import { getSubscriptionBenefits, getSubscriptionPricing, getMySubscription } from '@/api/vip';

export default function VipRechargePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('monthly');

  const [benefitsRes, setBenefitsRes] = useState(null);
  const [pricingRes, setPricingRes] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(null);
  const [mySubscription, setMySubscription] = useState(null);

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

  // 首次进入时查询当前订阅/权益状态
  useEffect(() => {
    let alive = true;
    getMySubscription()
      .then((res) => {
        if (!alive) return;
        setMySubscription(res?.data ?? res);
      })
      .catch(() => {
        // 静默失败，页面仍可正常使用
      });
    return () => {
      alive = false;
    };
  }, []);

  const planCardsData = useMemo(
    () => getVipRechargePlans({ benefitsRes, pricingRes }),
    [benefitsRes, pricingRes]
  );

  // 为每个方案注入统一的购买回调（根据环境走 Stars 或 AppKit 支付）
  // Free 版本无需购买，保持原始 onSubscribe（仅前端行为）
  const planCardsWithHandlers = useMemo(() => {
    const result = {};
    Object.entries(planCardsData || {}).forEach(([tabKey, plans]) => {
      result[tabKey] = (plans || []).map((plan) => {
        if (plan.title === 'Free') {
          return plan;
        }
        return {
          ...plan,
          onSubscribe: (payload) => startVipPurchase({ tabKey, plan, payload }),
        };
      });
    });
    return result;
  }, [planCardsData]);

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
          <VipRechargePlanCards plans={planCardsWithHandlers[activeTab] || []} />
        </div>
      </div>
    </div>
  );
}
