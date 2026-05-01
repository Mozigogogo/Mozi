'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import styles from './index.module.less';

// 使用项目中已有的 VIP 图标，如果没有则需要替换
const VIP_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_user/vip_logo.png';

export default function VipBanner({ onClick, planCode }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isFreePlan = String(planCode || '').toLowerCase() === 'free';
  const isEnglish = String(i18n?.language || '').toLowerCase().startsWith('en');

  const handleBtnClick = () => {
    if (isFreePlan) {
      onClick?.();
      return;
    }
    router.push('/benefits');
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftContent}>
        <div className={styles.iconWrapper}>
          {/* 使用本地 VIP 图标，如果需要更复杂的图形可以替换图片源 */}
          <img src={VIP_ICON} className={styles.icon} alt="VIP" />
        </div>
        <div
          className={`${styles.text} ${isEnglish ? styles.textEn : ''} ${isEnglish && !isFreePlan ? styles.textMemberCenterEn : ''}`}
        >
          {isFreePlan
            ? (t('user.vipBannerTextFreePlan') || 'Unlock 7-Day Whale Signals · Free Trial')
            : (t('user.vipBannerMemberCenter') || '会员中心')}
        </div>
      </div>
      <div className={styles.subscribeBtn} onClick={handleBtnClick}>
        {isFreePlan ? (t('user.subscribeNow') || '立即订阅') : (t('user.enter') || '进入')}
      </div>
    </div>
  );
}
