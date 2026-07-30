'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { pushWithRouteBootLoading } from '@/utils/routeBootLoading';
import styles from './index.module.less';

export default function PinkContainer() {
  const { t } = useTranslation();
  const router = useRouter();

  const buttons = useMemo(() => [
    {
      id: 'ai',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/ai_chat.svg',
      label: t('home.quickActions.ai'),
      onClick: () => pushWithRouteBootLoading(router, '/ai')
    },
    {
      id: 'price',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/price_wran.svg',
      label: t('home.quickActions.priceMonitor'),
      onClick: () => router.push('/mywarn')
    },
    {
      id: 'notice',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/announcement_onitoring.svg',
      label: t('home.quickActions.noticeMonitor'),
      onClick: () => router.push('/user?scrollTo=calendar')
    },
    {
      id: 'sector',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/block_select.svg',
      label: t('home.quickActions.sectorSelect'),
      onClick: () => router.push('/hotsector')
    },
    {
      id: 'news',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/breaking.svg',
      label: t('home.quickActions.news'),
      onClick: () => router.push('/community?tab=news')
    },
    {
      id: 'discover',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/find_coin.svg',
      label: t('home.quickActions.discoverCoins'),
      onClick: () => router.push('/community?tab=discovery')
    },
    {
      id: 'ask',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/question.svg',
      label: t('home.quickActions.askQuestion'),
      onClick: () => router.push('/community?tab=question')
    },
    {
      id: 'ranking',
      icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/calendar.png',
      label: t('home.quickActions.rankingSelect'),
      onClick: () => router.push('/daily')
    }
  ], [router, t]);

  return (
    <div className={styles.quickActionsContainer}>
      <div className={styles.gridContainer}>
        {buttons.map((button, index) => (
          <div
            key={button.id}
            className={styles.gridItem}
            onClick={button.onClick}
          >
            <div className={styles.iconWrapper}>
              <img
                src={button.icon} 
                alt={button.label}
                className={styles.iconImage}
                loading="eager"
                decoding="async"
                fetchPriority={index < 4 ? 'high' : 'auto'}
              />
            </div>
            <div className={styles.label}>{button.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
