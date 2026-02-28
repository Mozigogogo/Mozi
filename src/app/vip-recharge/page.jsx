'use client';

import React, { useEffect, useState, useRef } from 'react';
import NavBar from '@/components/NavBar';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import { isTelegramEnv, handleVipPurchase } from '@/utils/core';
import { getSubscriptionBenefits, getSubscriptionPricing, getMySubscription } from '@/api/vip';
import styles from './page.module.less';

export default function VipRechargePage() {
  const { t } = useTranslation();
  const fetchedRef = useRef(false);
  
  // Fallback plans if API fails or while loading
  const defaultPlans = [
    { 
      title: t('vipRecharge.plans.yearly.title'), 
      price: t('vipRecharge.plans.yearly.price'), 
      unit: t('vipRecharge.plans.yearly.unit'), 
      recommend: true, 
      id: 'yearly' 
    },
    { 
      title: t('vipRecharge.plans.quarterly.title'), 
      price: t('vipRecharge.plans.quarterly.price'), 
      unit: t('vipRecharge.plans.quarterly.unit'), 
      id: 'quarterly' 
    },
    { 
      title: t('vipRecharge.plans.monthly.title'), 
      price: t('vipRecharge.plans.monthly.price'), 
      unit: t('vipRecharge.plans.monthly.unit'), 
      id: 'monthly' 
    },
  ];

  const [plans, setPlans] = useState(defaultPlans);
  const [benefits, setBenefits] = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlans.find(p => p.recommend)?.id || defaultPlans[0].id);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [benefitsRes, mySubRes] = await Promise.all([
          getSubscriptionBenefits(),
          getMySubscription()
        ]);

        if (benefitsRes.code === 0) {
          setBenefits(benefitsRes.data || []);
        }

        // Mock data for pricing plans
        const mockPlans = [
          { 
            id: 'yearly',
            title: t('vipRecharge.plans.yearly.title'), 
            price: t('vipRecharge.plans.yearly.price'), 
            unit: t('vipRecharge.plans.yearly.unit'), 
            recommend: true 
          },
          { 
            id: 'quarterly',
            title: t('vipRecharge.plans.quarterly.title'), 
            price: t('vipRecharge.plans.quarterly.price'), 
            unit: t('vipRecharge.plans.quarterly.unit')
          },
          { 
            id: 'monthly',
            title: t('vipRecharge.plans.monthly.title'), 
            price: t('vipRecharge.plans.monthly.price'), 
            unit: t('vipRecharge.plans.monthly.unit')
          }
        ];
        
        setPlans(mockPlans);
        const recommend = mockPlans.find(p => p.recommend);
        setSelectedPlanId(recommend ? recommend.id : mockPlans[0]?.id);

        if (mySubRes.code === 0) {
          setMySubscription(mySubRes.data);
        }

      } catch (error) {
        console.error('Failed to fetch VIP data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const basicFeatures = [
    { icon: <img src="/images/recharge/market_situation.svg" alt="market" />, text: t('vipRecharge.basic.features.market'), active: true },
    { icon: <img src="/images/recharge/push.svg" alt="push" />, text: t('vipRecharge.basic.features.push'), active: true },
    { icon: <img src="/images/recharge/ai.svg" alt="ai" />, text: t('vipRecharge.basic.features.ai'), active: true },
    { icon: <img src="/images/recharge/tags.svg" alt="tags" />, text: '', active: false, locked: true },
    { icon: <img src="/images/recharge/advertisement.svg" alt="ad" />, text: t('vipRecharge.basic.features.ad'), active: true },
    { icon: <img src="/images/recharge/group.svg" alt="group" />, text: '', active: false, locked: true },
    { icon: <img src="/images/recharge/skin.svg" alt="skin" />, text: t('vipRecharge.basic.features.skin'), active: true },
  ];

  const vipFeatures = [
    { icon: <img src="/images/recharge/market_situation.svg" alt="market" />, text: t('vipRecharge.vip.features.market') },
    { icon: <img src="/images/recharge/push.svg" alt="push" />, text: t('vipRecharge.vip.features.push') },
    { icon: <img src="/images/recharge/ai.svg" alt="ai" />, text: t('vipRecharge.vip.features.ai') },
    { icon: <img src="/images/recharge/tags.svg" alt="tags" />, text: t('vipRecharge.vip.features.tags') },
    { icon: <img src="/images/recharge/advertisement.svg" alt="ad" />, text: t('vipRecharge.vip.features.ad') },
    { icon: <img src="/images/recharge/group.svg" alt="group" />, text: t('vipRecharge.vip.features.group') },
    { icon: <img src="/images/recharge/skin.svg" alt="skin" />, text: t('vipRecharge.vip.features.skin') },
  ];

  const handlePurchase = async () => {
    await handleVipPurchase(selectedPlanId, t);
  };

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <NavBar
        title={t('vipRecharge.title')}
        backgroundColor="rgba(58, 36, 14, 1)"
        showBorder={false}
        fixed={true}
        color="white"
      />

      <div className={styles.lockBadge}>
        {t('vipRecharge.lockBadge')}
      </div>
      
      <div className={styles.content}>
        {/* Plan Selection */}
        <div className={styles.plansRow}>
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`${styles.planCard} ${selectedPlanId === plan.id ? styles.active : ''}`}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              {plan.recommend && <div className={styles.recommendBadge}>{t('vipRecharge.recommend')}</div>}
              <div className={styles.planTitle}>{plan.title}</div>
              <div className={styles.planPrice}>{plan.price}</div>
              <div className={styles.planUnit}>{plan.unit}</div>
            </div>
          ))}
        </div>

        {/* Comparison Section */}
        <div className={styles.comparisonSection}>
          {/* Basic Column */}
          <div className={styles.basicColumn}>
            <div className={styles.colHeader}>
              <div className={styles.colTitle}>{t('vipRecharge.basic.title')}</div>
              <div className={styles.colSubtitle}>{t('vipRecharge.basic.subtitle')}</div>
              <img src="/images/recharge/basic_divider.svg" alt="divider" className={styles.dividerLine} />
            </div>
            <div className={styles.featureList}>
              {basicFeatures.map((feature, index) => (
                <div key={index} className={`${styles.featureItem} ${feature.locked ? styles.locked : ''}`}>
                  <span className={styles.icon}>{feature.icon}</span>
                  {feature.text && <span className={styles.text}>{feature.text}</span>}
                  {feature.locked && <img src="/images/recharge/lock.svg" alt="locked" className={styles.lockedIcon} />}
                </div>
              ))}
            </div>
          </div>

          {/* VIP Column */}
          <div className={styles.vipColumn}>
             <div className={styles.colHeader}>
              <div className={styles.colTitle}>{t('vipRecharge.vip.title')}</div>
              <div className={styles.colSubtitle}>{t('vipRecharge.vip.subtitle')}</div>
              {/* Tiny crown decoration could go here */}
              <img src="/icons/new_user/vip_logo.png" alt="vip logo" className={styles.vipLogo} />
              <img src="/images/recharge/vip_divider.svg" alt="divider" className={styles.dividerLine} />
            </div>
            <div className={styles.featureList}>
              {vipFeatures.map((feature, index) => (
                <div key={index} className={styles.featureItem}>
                  <span className={styles.icon}>{feature.icon}</span>
                  <span className={styles.text}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className={styles.footer}>
        <button className={styles.confirmButton} onClick={handlePurchase}>
          {t('vipRecharge.confirmPurchase')}
        </button>
      </div>
    </div>
  );
}
