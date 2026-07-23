'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Grid } from 'antd-mobile';
import { jump2NoTab } from '../../utils/core';
import styles from './index.module.less';

// 合约专区图标（使用本地SVG）
const bullBearRatioIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/bull_bear_ratio.png';
const inventoryIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/position_size.png';
const fundingRateIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/funding_rate.png';
const volumeTransactionIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/trade_volume.png';

export default function DerivativeArea({ inCarousel = false }) {
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
    <div className={`${styles.derivativeContainer} ${inCarousel ? styles.inCarousel : ''}`}>
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
