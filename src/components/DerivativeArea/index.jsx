'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Grid } from 'antd-mobile';
import { jump2NoTab } from '../../utils/core';
import styles from './index.module.less';

// CDN 图片前缀
const CDN_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets';

// 合约专区图标（使用CDN）
const bullBearRatioIcon = `${CDN_PREFIX}/icon/bull-bear-ratio.png`;
const inventoryIcon = `${CDN_PREFIX}/icon/inventory.png`;
const fundingRateIcon = `${CDN_PREFIX}/icon/funding-rate.png`;
const volumeTransactionIcon = `${CDN_PREFIX}/icon/volume-transaction.png`;

export default function DerivativeArea() {
  const { t } = useTranslation();
  const router = useRouter();

  const title = t('home.derivatives');
  const list = [
    { icon: bullBearRatioIcon, text: t('market.putCallRatio'), callback: () => { jump2NoTab('putcallratio'); } },
    { icon: inventoryIcon, text: t('market.positionSize'), callback: () => { jump2NoTab('positionsize'); } },
    { icon: fundingRateIcon, text: t('market.fundingRate'), callback: () => { jump2NoTab('fundingrate'); } },
    { icon: volumeTransactionIcon, text: t('market.tradeVolume'), callback: () => { jump2NoTab('tradevol'); } },
  ];

  return (
    <div className={styles.derivativeContainer}>
      <div className={styles.derivativeTitle}>{title}</div>
      <div className={styles.derivativeBody}>
        <Grid columns={4}>
          {list.map((item, index) => (
            <Grid.Item key={index} className={styles.derivativeItem} onClick={item.callback}>
              <div className={styles.derivativeIcon}>
                <img src={item.icon} alt={item.text} />
              </div>
              <span>{item.text}</span>
            </Grid.Item>
          ))}
        </Grid>
      </div>
    </div>
  );
}
