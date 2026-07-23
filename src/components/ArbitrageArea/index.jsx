'use client';

import { useMemo } from 'react';
import { Grid } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import styles from './index.module.less';

const CDN = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public';

// 套利专区图标（与合约专区区分，均来自站内已有资源）
const fundingArbIcon = `${CDN}/benefits/big_deal.svg`; // 套利机会
const spreadIcon = `${CDN}/icons/new_detail/price_wran.svg`; // 价格监控 / 价差
const basisIcon = `${CDN}/benefits/market_gold.svg`; // 行情走势 / 基差
const oiAnomalyIcon = `${CDN}/icons/new_detail/breaking.svg`; // 异动信号

export default function ArbitrageArea({ inCarousel = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const title = t('pcHome.arbitrage.title') || '套利专区';

  const items = useMemo(
    () => [
      { key: 'funding', icon: fundingArbIcon, text: 'Funding 套利' },
      { key: 'spread', icon: spreadIcon, text: '现货价差' },
      { key: 'basis', icon: basisIcon, text: '基差套利' },
      { key: 'oi', icon: oiAnomalyIcon, text: 'OI 异动' },
    ],
    []
  );

  return (
    <div className={`${styles.arbitrageContainer} ${inCarousel ? styles.inCarousel : ''}`}>
      <div className={styles.arbitrageTitle}>{title}</div>
      <div className={styles.arbitrageBody}>
        <Grid columns={4}>
          {items.map((item) => (
            <Grid.Item
              key={item.key}
              className={styles.arbitrageItem}
              onClick={() => {
                router.push(`/arbitrage?tab=${item.key}`);
              }}
            >
              <div className={styles.arbitrageIcon}>
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

