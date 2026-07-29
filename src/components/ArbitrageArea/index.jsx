'use client';

import { useMemo } from 'react';
import { Grid } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import styles from './index.module.less';

const ICON_CDN = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com';

const fundingArbIcon = `${ICON_CDN}/icon-funding.svg`;
const spreadIcon = `${ICON_CDN}/icon-spread.svg`;
const basisIcon = `${ICON_CDN}/icon-basis.svg`;
const oiAnomalyIcon = `${ICON_CDN}/icon-oi.svg`;

export default function ArbitrageArea({ inCarousel = false }) {
  const router = useRouter();
  const { t } = useTranslation();
  const title = t('pcHome.arbitrage.title') || '套利专区';

  const items = useMemo(
    () => [
      {
        key: 'funding',
        icon: fundingArbIcon,
        text: (
          <>
            <span className={styles.enLabel}>Funding</span>{' '}
            {t('pcHome.arbitrage.fundingSuffix')}
          </>
        ),
        alt: t('pcHome.arbitrage.funding'),
      },
      {
        key: 'spread',
        icon: spreadIcon,
        text: t('pcHome.arbitrage.spread'),
        alt: t('pcHome.arbitrage.spread'),
      },
      {
        key: 'basis',
        icon: basisIcon,
        text: t('pcHome.arbitrage.basis'),
        alt: t('pcHome.arbitrage.basis'),
      },
      {
        key: 'oi',
        icon: oiAnomalyIcon,
        text: t('pcHome.arbitrage.oi'),
        alt: t('pcHome.arbitrage.oi'),
      },
    ],
    [t]
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
                <img src={item.icon} alt={item.alt} />
              </div>
              <span className={styles.arbitrageLabel}>{item.text}</span>
            </Grid.Item>
          ))}
        </Grid>
      </div>
    </div>
  );
}

