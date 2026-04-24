'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import VipRechargeTabs from './components/VipRechargeTabs';
import VipRechargePlanCards from './components/VipRechargePlanCards';
import { getVipRechargePlans } from './components/getVipRechargePlans';
import { isTelegramEnv, startVipPurchase } from './utils/startVipPurchase';
import { getSubscriptionBenefits, getSubscriptionPricing, getMySubscription } from '@/api/vip';
import { confirm } from '@/components/Modal/confirm';

/**
 * 订阅方案主体：月/年切换 + 方案卡片。供移动端 vip-recharge 与 PC /subscribe 复用。
 */
export default function VipRechargePageBody({
  contentClassName,
  planCardsClassName,
  tabsWrapClassName,
  renderTabs = true,
  onTabsNode,
  preferredPurchaseMethod,
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('monthly');
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

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

  useEffect(() => {
    let alive = true;
    getMySubscription()
      .then((res) => {
        if (!alive) return;
        setMySubscription(res?.data ?? res);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const pollingStart = () => setPurchaseSubmitting(true);
    const pollingDone = () => setPurchaseSubmitting(false);
    const purchaseLoading = (e) => {
      const isLoading = !!e?.detail?.loading;
      setPurchaseSubmitting(isLoading);
    };
    const handler = (e) => {
      const detail = e?.detail || {};
      if (!detail.tabKey || !detail.planTitle) return;
      setOrderSuccessInfo({
        tabKey: detail.tabKey,
        planTitle: detail.planTitle,
      });
      getMySubscription()
        .then((res) => {
          setMySubscription(res?.data ?? res);
        })
        .catch(() => {});
    };
    window.addEventListener('mozi:vipOrderSuccess', handler);
    window.addEventListener('mozi:starsOrderSuccess', handler);
    window.addEventListener('mozi:vipOrderPolling', pollingStart);
    window.addEventListener('mozi:vipOrderPollingDone', pollingDone);
    window.addEventListener('mozi:vipPurchaseLoading', purchaseLoading);
    return () => {
      window.removeEventListener('mozi:vipOrderSuccess', handler);
      window.removeEventListener('mozi:starsOrderSuccess', handler);
      window.removeEventListener('mozi:vipOrderPolling', pollingStart);
      window.removeEventListener('mozi:vipOrderPollingDone', pollingDone);
      window.removeEventListener('mozi:vipPurchaseLoading', purchaseLoading);
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
            // PC 端 Arbitrum 购买前置：未连接钱包时先提示并引导连接
            if (!isTelegramEnv() && preferredPurchaseMethod === 'ARBITRUM') {
              let walletAddress = '';
              try {
                if (typeof window !== 'undefined' && typeof window.__getConnectedEvmAddress === 'function') {
                  walletAddress = window.__getConnectedEvmAddress() || '';
                }
                if (!walletAddress && typeof window !== 'undefined' && window.ethereum?.request) {
                  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                  walletAddress = accounts?.[0] || '';
                }
              } catch (_) {}

              if (!walletAddress) {
                message.warning(t('auth.connectWalletFirst') || '请先连接钱包后再购买');
                try {
                  if (typeof window !== 'undefined' && typeof window.__openRainbowKit === 'function') {
                    window.__openRainbowKit();
                  }
                } catch (_) {}
                return;
              }
            }

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
            startVipPurchase({ tabKey, plan, payload, preferredMethod: preferredPurchaseMethod });
          },
        };

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

  const tabsNode = useMemo(() => <VipRechargeTabs t={t} onChange={setActiveTab} />, [t]);

  useEffect(() => {
    if (typeof onTabsNode === 'function') onTabsNode(tabsNode);
  }, [onTabsNode, tabsNode]);

  return (
    <div className={contentClassName}>
      {renderTabs &&
        (tabsWrapClassName ? <div className={tabsWrapClassName}>{tabsNode}</div> : tabsNode)}
      <div className={planCardsClassName} key={activeTab}>
        {remoteError && !remoteLoading && <div>{t('vipRecharge.errors.loadSubscriptionData')}</div>}
        <VipRechargePlanCards plans={planCardsWithHandlers[activeTab] || []} loading={purchaseSubmitting} />
      </div>
    </div>
  );
}
