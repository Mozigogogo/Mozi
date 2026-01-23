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
      label: 'AI问答',
      onClick: () => router.push('/robot')
    },
    {
      id: 'price',
      icon: '/icons/new_detail/price_wran.svg',
      label: '价格监控',
      onClick: () => router.push('/mywarn')
    },
    {
      id: 'notice',
      icon: '/icons/new_detail/announcement_onitoring.svg',
      label: '公告监控',
      onClick: () => router.push('/mynotices')
    },
    {
      id: 'sector',
      icon: '/icons/new_detail/block_select.svg',
      label: '板块选币',
      onClick: () => router.push('/find')
    },
    {
      id: 'news',
      icon: '/icons/new_detail/breaking.svg',
      label: '快讯',
      onClick: () => router.push('/community')
    },
    {
      id: 'discover',
      icon: '/icons/new_detail/find_coin.svg',
      label: '发现好币',
      onClick: () => router.push('/find')
    },
    {
      id: 'ask',
      icon: '/icons/new_detail/question.svg',
      label: '不懂就问',
      onClick: () => router.push('/robot')
    },
    {
      id: 'ranking',
      icon: '/icons/new_detail/List_selected_coins.svg',
      label: '榜单选币',
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
