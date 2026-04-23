'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import styles from './index.module.less';

export default function PinkContainer() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loadedIcons, setLoadedIcons] = useState({});

  const buttons = useMemo(() => [
    {
      id: 'ai',
      icon: '/icons/new_detail/ai_chat.svg',
      label: t('home.quickActions.ai'),
      onClick: () => router.push('/ai')
    },
    {
      id: 'price',
      icon: '/icons/new_detail/price_wran.svg',
      label: t('home.quickActions.priceMonitor'),
      onClick: () => router.push('/mywarn')
    },
    {
      id: 'notice',
      icon: '/icons/new_detail/announcement_onitoring.svg',
      label: t('home.quickActions.noticeMonitor'),
      onClick: () => router.push('/user?scrollTo=calendar')
    },
    {
      id: 'sector',
      icon: '/icons/new_detail/block_select.svg',
      label: t('home.quickActions.sectorSelect'),
      onClick: () => router.push('/hotsector')
    },
    {
      id: 'news',
      icon: '/icons/new_detail/breaking.svg',
      label: t('home.quickActions.news'),
      onClick: () => router.push('/community?tab=news')
    },
    {
      id: 'discover',
      icon: '/icons/new_detail/find_coin.svg',
      label: t('home.quickActions.discoverCoins'),
      onClick: () => router.push('/community?tab=discovery')
    },
    {
      id: 'ask',
      icon: '/icons/new_detail/question.svg',
      label: t('home.quickActions.askQuestion'),
      onClick: () => router.push('/community?tab=question')
    },
    {
      id: 'ranking',
      icon: '/icons/new_home/calendar.png',
      label: t('home.quickActions.rankingSelect'),
      onClick: () => router.push('/daily')
    }
  ], [router, t]);

  // 进入首页即预热图标到浏览器缓存，减少首屏等待
  useEffect(() => {
    buttons.forEach((button) => {
      const img = new window.Image();
      img.src = button.icon;
    });
  }, [buttons]);

  return (
    <div className={styles.quickActionsContainer}>
      <div className={styles.gridContainer}>
        {buttons.map((button) => (
          <div
            key={button.id}
            className={styles.gridItem}
            onClick={button.onClick}
          >
            <div
              className={`${styles.iconWrapper} ${loadedIcons[button.id] ? '' : styles.iconPulse}`}
            >
              <img
                src={button.icon} 
                alt={button.label}
                className={styles.iconImage}
                loading="eager"
                decoding="async"
                onLoad={() => {
                  setLoadedIcons((prev) => ({ ...prev, [button.id]: true }));
                }}
                onError={() => {
                  setLoadedIcons((prev) => ({ ...prev, [button.id]: true }));
                }}
              />
            </div>
            <div className={styles.label}>{button.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
