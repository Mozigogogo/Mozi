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
import { confirm } from '@/components/Modal/confirm';

export default function VipRechargePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('monthly');

  const [benefitsRes, setBenefitsRes] = useState(null);
  const [pricingRes, setPricingRes] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(null);
  const [mySubscription, setMySubscription] = useState(null);
  const [orderSuccessInfo, setOrderSuccessInfo] = useState(null);

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

  // 监听 Stars 支付订单成功事件，用于本地即时更新按钮文案
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (e) => {
      const detail = e?.detail || {};
      if (!detail.tabKey || !detail.planTitle) return;
      setOrderSuccessInfo({
        tabKey: detail.tabKey,
        planTitle: detail.planTitle,
      });
      // 可选：支付成功后刷新一次我的订阅信息，保证和服务端一致
      getMySubscription()
        .then((res) => {
          setMySubscription(res?.data ?? res);
        })
        .catch(() => {});
    };
    window.addEventListener('mozi:starsOrderSuccess', handler);
    return () => {
      window.removeEventListener('mozi:starsOrderSuccess', handler);
    };
  }, []);

  const planCardsData = useMemo(
    () => getVipRechargePlans({ benefitsRes, pricingRes }),
    [benefitsRes, pricingRes]
  );

  const currentSubInfo = useMemo(() => {
    if (!mySubscription) return null;
    const data = mySubscription;
    const planCode = (data.planCode || data.plan_name || '').toUpperCase();
    const billing = (data.billingCycle || data.cycle || '').toLowerCase();
    let tabKey = null;
    if (billing === 'month' || billing === 'monthly') tabKey = 'monthly';
    if (billing === 'year' || billing === 'yearly') tabKey = 'yearly';
    return {
      tabKey,
      planCode,
    };
  }, [mySubscription]);

  // 为每个方案注入统一的购买回调（根据环境走 Stars 或 AppKit 支付）
  // Free 版本无需购买，保持原始 onSubscribe（仅前端行为）
  const planCardsWithHandlers = useMemo(() => {
    const currentPlanName =
      (mySubscription?.planCode || mySubscription?.plan_name || mySubscription?.plan || mySubscription?.tierCode || '')
        ?.toString?.() || '';

    const shouldAskSwitch = (targetPlanTitle) => {
      const currentCode = (currentSubInfo?.planCode || '').toUpperCase();
      if (!currentCode || currentCode === 'FREE' || currentCode === '0' || currentCode === 'NONE') return false;
      const nextCode = (targetPlanTitle || '').toUpperCase();
      if (!nextCode || nextCode === 'FREE') return false;
      return currentCode !== nextCode;
    };

    const result = {};
    Object.entries(planCardsData || {}).forEach(([tabKey, plans]) => {
      result[tabKey] = (plans || []).map((plan) => {
        const isCurrentByOrder =
          orderSuccessInfo &&
          orderSuccessInfo.tabKey === tabKey &&
          orderSuccessInfo.planTitle === plan.title;

        const isCurrentByMySub =
          currentSubInfo &&
          (!currentSubInfo.tabKey || currentSubInfo.tabKey === tabKey) &&
          currentSubInfo.planCode === (plan.title || '').toUpperCase();

        if (plan.title === 'Free') {
          return plan;
        }
        const enhancedPlan = {
          ...plan,
          onSubscribe: async (payload) => {
            if (shouldAskSwitch(plan?.title)) {
              const ok = await confirm({
                title: t('vipRecharge.switchConfirm.title'),
                content: (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {t('vipRecharge.switchConfirm.headline')}
                    </div>
                    <div style={{ color: '#4b5563' }}>
                      {t('vipRecharge.switchConfirm.currentPlan')}{' '}
                      <span style={{ fontWeight: 600 }}>{currentPlanName || currentSubInfo?.planCode || '--'}</span>
                    </div>
                    <div style={{ color: '#4b5563' }}>
                      {t('vipRecharge.switchConfirm.nextPlan')}{' '}
                      <span style={{ fontWeight: 600 }}>{plan?.title || '--'}</span>
                    </div>
                    <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 12 }}>
                      {t('vipRecharge.switchConfirm.hint')}
                    </div>
                  </div>
                ),
                cancelText: t('common.cancel'),
                confirmText: t('vipRecharge.switchConfirm.confirm'),
                closeOnAction: true,
                bodyStyle: { borderRadius: '16px' },
              });
              if (!ok) return;
            }
            startVipPurchase({ tabKey, plan, payload });
          },
        };

        // 如果当前方案已通过 Stars 支付成功，则按钮展示为“当前订阅”并禁用再次点击
        if (isCurrentByOrder || isCurrentByMySub) {
          return {
            ...enhancedPlan,
            buttonText: t('vipRecharge.planCard.cta.current'),
            disabled: true,
          };
        }

        return enhancedPlan;
      });
    });
    return result;
  }, [planCardsData, orderSuccessInfo, currentSubInfo, mySubscription, t]);

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
