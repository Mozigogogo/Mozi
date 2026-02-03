'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

// 使用项目中已有的 VIP 图标，如果没有则需要替换
const VIP_ICON = '/icons/new_user/vip_logo.png';

export default function VipBanner({ onClick }) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.leftContent}>
        <div className={styles.iconWrapper}>
          {/* 使用本地 VIP 图标，如果需要更复杂的图形可以替换图片源 */}
          <img src={VIP_ICON} className={styles.icon} alt="VIP" />
        </div>
        <div className={styles.text}>
          {t('user.vipBannerText') || '免费试用14天，马上开启新体验!'}
        </div>
      </div>
      <div className={styles.subscribeBtn} onClick={onClick}>
        {t('user.subscribeNow') || '立即订阅'}
      </div>
    </div>
  );
}
