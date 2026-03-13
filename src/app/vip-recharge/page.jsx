'use client';

import React, { useState } from 'react';
import NavBar from '@/components/NavBar';
import VipTabs from '@/components/VipTabs';
import PlanCard from '@/components/PlanCard';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

export default function VipRechargePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('monthly');

  // Plan cards data for different periods
  const planCardsData = {
    monthly: [
      {
        id: 1,
        title: 'Free',
        price: '0',
        currency: '$',
        period: '/月',
        description: 'Save $100',
        accentColor: '#C1C1C1',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '120x',
          subtitle: '升级到Lite/Pro可享受',
          locked: true,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情', icon: '/point/Order_situation.svg' },
          { label: 'AI Call', icon: '/point/AI_call.svg' },
          { label: '月度积分', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '开始体验',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Free'),
      },
      {
        id: 2,
        title: 'Lite',
        price: '24.99',
        currency: '$',
        period: '/月',
        description: 'Save $100',
        accentColor: '#22C55E',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '120x',
          subtitle: 'Every 30-Day Cycle',
          locked: false,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 20条（5s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 20次/月', icon: '/point/AI_call.svg' },
          { label: '月度积分 5000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '标准客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: true,
        badge: 'MASTER',
        onSubscribe: () => console.log('Subscribe to Lite'),
      },
      {
        id: 3,
        title: 'Pro',
        price: '49.9',
        currency: '$',
        period: '/月',
        description: 'Save $100',
        accentColor: '#FACC15',
        tierSelect: {
          label: '选择等级',
          defaultId: 'lv1',
          options: [
            { id: 'lv1', title: '10000积分/月', subtitle: 'AI Call 40次' },
            { id: 'lv2', title: '30000积分/月', subtitle: 'AI Call 100次' },
            { id: 'lv3', title: '50000积分/月', subtitle: 'AI Call 200次' },
            { id: 'lv4', title: '100000积分/月', subtitle: 'AI Call 500次' },
          ],
          onChange: (opt) => console.log('Pro level:', opt),
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 40条（0s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 40~220次/月', icon: '/point/AI_call.svg' },
          { label: '月度积分 10000~10,000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属黑金标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '专属客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Pro'),
      },
    ],
    yearly: [
      {
        id: 1,
        title: 'Free',
        price: '0',
        currency: '$',
        period: '/年',
        description: 'Save $100',
        accentColor: '#C1C1C1',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '120x',
          subtitle: '升级到Lite/Pro可享受',
          locked: true,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情', icon: '/point/Order_situation.svg' },
          { label: 'AI Call', icon: '/point/AI_call.svg' },
          { label: '月度积分', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '开始体验',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Free Yearly'),
      },
      {
        id: 2,
        title: 'Lite',
        price: '249.99',
        currency: '$',
        period: '/年',
        description: 'Save $100',
        accentColor: '#22C55E',
        highlightFeature: {
          label: 'AI CALL / 月',
          value: '120x',
          subtitle: 'Every 30-Day Cycle',
          locked: false,
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 20条（5s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 20次/月', icon: '/point/AI_call.svg' },
          { label: '月度积分 5000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '标准客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '开始体验',
        isPopular: true,
        badge: 'MASTER',
        onSubscribe: () => console.log('Subscribe to Lite Yearly'),
      },
      {
        id: 3,
        title: 'Pro',
        price: '499.9',
        currency: '$',
        period: '/年',
        description: 'Save $100',
        accentColor: '#FACC15',
        tierSelect: {
          label: '选择等级',
          defaultId: 'lv1',
          options: [
            { id: 'lv1', title: '10000积分/月', subtitle: 'AI Call 40次' },
            { id: 'lv2', title: '30000积分/月', subtitle: 'AI Call 100次' },
            { id: 'lv3', title: '50000积分/月', subtitle: 'AI Call 200次' },
            { id: 'lv4', title: '100000积分/月', subtitle: 'AI Call 500次' },
          ],
          onChange: (opt) => console.log('Pro yearly level:', opt),
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market .svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 40条（0s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 40~220次/月', icon: '/point/AI_call.svg' },
          { label: '月度积分 10000~10,000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属黑金标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '专属客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: false,
        onSubscribe: () => console.log('Subscribe to Pro Yearly'),
      },
    ],
    lifetime: [
      {
        id: 1,
        title: 'Pro',
        price: '499.9',
        currency: '$',
        period: '/lifetime',
        description: 'Save $100',
        accentColor: '#FACC15',
        tierSelect: {
          label: '选择等级',
          defaultId: 'lv1',
          options: [
            { id: 'lv1', title: '10000积分/月', subtitle: 'AI Call 40次' },
            { id: 'lv2', title: '30000积分/月', subtitle: 'AI Call 100次' },
            { id: 'lv3', title: '50000积分/月', subtitle: 'AI Call 200次' },
            { id: 'lv4', title: '100000积分/月', subtitle: 'AI Call 500次' },
          ],
          onChange: (opt) => console.log('Pro lifetime level:', opt),
        },
        features: [
          { label: '基础行情', icon: '/point/Basic_market.svg' },
          { label: 'APP基础推送', icon: '/point/Information_push.svg' },
          { label: '邮件告警', icon: '/point/Email_alert.svg' },
          { label: '大单行情 40条（0s延迟）', icon: '/point/Order_situation.svg' },
          { label: 'AI Call 40~220次/月', icon: '/point/AI_call.svg' },
          { label: '月度积分 10000~10,000/月', icon: '/point/Monthly_points.svg' },
          { label: '专属黑金标志', icon: '/point/Exclusive_logo.svg' },
          { label: '无广告', icon: '/point/No_advertisement.svg' },
          { label: '多主题切换', icon: '/point/Topic_witching.svg' },
          { label: '专属客服', icon: '/point/Customer_service.svg' },
          { label: 'Alpha核心群', icon: '/point/Alpha_core_group.svg' },
        ],
        buttonText: '立即购买',
        isPopular: true,
        badge: 'BEST VALUE',
        onSubscribe: () => console.log('Subscribe to Pro Lifetime'),
      },
    ],
  };

  // Tabs data - only for switching, no content
  const tabs = [
    { id: 'monthly', label: t('vip.plan.month') },
    { id: 'yearly', label: t('vip.plan.year'), badge: t('vip.planCard.savingBadge', { percent: 17 }) },
  ];

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <NavBar
        title={t('vipRecharge.title')}
        backgroundColor="#fff"
        showBorder={false}
        fixed={true}
        color="black"
      />

      <div className={styles.content}>
        {/* VipTabs Component - only for tab switching */}
        <VipTabs
          tabs={tabs}
          defaultActiveId="monthly"
          onChange={setActiveTab}
          variant="highlight"
          size="medium"
          headerOnly={true}
        />

        {/* Plan Cards Container - outside tabs */}
        <div className={styles.planCardsContainer} key={activeTab}>
          {planCardsData[activeTab].map((plan) => (
            <PlanCard
              key={plan.id}
              title={plan.title}
              price={plan.price}
              currency={plan.currency}
              period={plan.period}
              description={plan.description}
              features={plan.features}
              highlightFeature={plan.highlightFeature}
              tierSelect={plan.tierSelect}
              accentColor={plan.accentColor}
              buttonText={plan.buttonText}
              isPopular={plan.isPopular}
              badge={plan.badge}
              onSubscribe={plan.onSubscribe}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
