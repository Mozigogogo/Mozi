'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './index.module.less';

export default function PinkContainer() {
  const { t } = useTranslation();
  const router = useRouter();

  const buttons = [
    {
      id: 'ai',
      icon: '/icons/new_detail/ai_chat.svg',
      label: t('home.quickActions.ai'),
      onClick: () => router.push('/robot')
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
      onClick: () => router.push('/mynotices')
    },
    {
      id: 'sector',
      icon: '/icons/new_detail/block_select.svg',
      label: t('home.quickActions.sectorSelect'),
      onClick: () => router.push('/find')
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
      icon: '/icons/new_detail/List_selected_coins.svg',
      label: t('home.quickActions.rankingSelect'),
      onClick: () => router.push('/find?tab=rank')
    }
  ];

  return (
    <div className={styles.quickActionsContainer}>
      <div className={styles.gridContainer}>
        {buttons.map((button) => (
          <div
            key={button.id}
            className={styles.gridItem}
            onClick={button.onClick}
          >
            <div className={styles.iconWrapper}>
              <Image 
                src={button.icon} 
                alt={button.label}
                width={40}
                height={40}
                className={styles.iconImage}
              />
            </div>
            <div className={styles.label}>{button.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
