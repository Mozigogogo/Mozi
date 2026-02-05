'use client';

import React from 'react';
import NavBar from '@/components/NavBar';
import { useTranslation } from 'react-i18next';
import { 
  HistogramOutline,
  MailOutline,
  SmileOutline,
  LockOutline,
  TeamOutline,
  AppOutline,
  CheckShieldOutline,
  StopOutline,
  TagOutline
} from 'antd-mobile-icons';
import styles from './page.module.less';

const Tags = ({ text }) => {
  return <span className={styles.lockedTag}>{text}</span>;
};

// Dividers moved to public/images/recharge

export default function VipRechargePage() {
  const { t } = useTranslation();

  const plans = [
    { title: '年卡', price: '$ 299.99', unit: '24.66/月', recommend: true, id: 'yearly' },
    { title: '季卡', price: '$ 74.99', unit: '25.00/月', id: 'quarterly' },
    { title: '月卡', price: '$ 24.99', unit: '24.99/月', id: 'monthly' },
  ];

  const [selectedPlanId, setSelectedPlanId] = React.useState(plans.find(p => p.recommend)?.id || plans[0].id);

  const basicFeatures = [
    { icon: <img src="/images/recharge/market_situation.svg" alt="market" />, text: '基础行情', active: true },
    { icon: <img src="/images/recharge/push.svg" alt="push" />, text: 'APP基础推送', active: true },
    { icon: <img src="/images/recharge/ai.svg" alt="ai" />, text: '每日1次体验', active: true },
    { icon: <img src="/images/recharge/tags.svg" alt="tags" />, text: '', active: false, locked: true },
    { icon: <img src="/images/recharge/advertisement.svg" alt="ad" />, text: '含广告', active: true },
    { icon: <img src="/images/recharge/group.svg" alt="group" />, text: '', active: false, locked: true },
    { icon: <img src="/images/recharge/skin.svg" alt="skin" />, text: '默认主题', active: true },
  ];

  const vipFeatures = [
    { icon: <img src="/images/recharge/market_situation.svg" alt="market" />, text: '主流交易所实时大单' },
    { icon: <img src="/images/recharge/push.svg" alt="push" />, text: '电话+邮件强触达' },
    { icon: <img src="/images/recharge/ai.svg" alt="ai" />, text: '无限次 智能分析' },
    { icon: <img src="/images/recharge/tags.svg" alt="tags" />, text: '黑金专属OG标识' },
    { icon: <img src="/images/recharge/advertisement.svg" alt="ad" />, text: '纯净无广沉浸式' },
    { icon: <img src="/images/recharge/group.svg" alt="group" />, text: '专属Alpha核心群' },
    { icon: <img src="/images/recharge/skin.svg" alt="skin" />, text: '多主题 自由切换' },
  ];

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <NavBar
        title={t('vip.title') || '会员充值'}
        backgroundColor="rgba(58, 36, 14, 1)"
        showBorder={false}
        fixed={true}
        color="white"
      />

      <div className={styles.lockBadge}>
        暂未解锁
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
              {plan.recommend && <div className={styles.recommendBadge}>推荐</div>}
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
              <div className={styles.colTitle}>基础版</div>
              <div className={styles.colSubtitle}>BASIC</div>
              <img src="/images/recharge/basic_divider.svg" alt="divider" style={{ width: '100%', marginBottom: 16, marginTop: 8 }} />
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
              <div className={styles.colTitle}>会员权益</div>
              <div className={styles.colSubtitle}>VIP/PRO</div>
              {/* Tiny crown decoration could go here */}
              <img src="/images/recharge/vip_divider.svg" alt="divider" style={{ width: '100%', marginBottom: 16, marginTop: 8 }} />
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
        <button className={styles.confirmButton}>
          {t('vip.confirmPurchase') || '确认购买'}
        </button>
      </div>
    </div>
  );
}
