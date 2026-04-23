'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import NavBar from '@/components/NavBar';
import PCLayout from '@/components/PCLayout';
import AchievementInviteCard from './AchievementInviteCard';
import AchievementOneTimeTasks from './AchievementOneTimeTasks';
import AchievementMoreRewardsBanner from './AchievementMoreRewardsBanner';
import AchievementDailyTasks from './AchievementDailyTasks';
import AchievementPoolStatusCard from './AchievementPoolStatusCard';
import AchievementPoolEventCard from './AchievementPoolEventCard';
import AchievementRankingCard from './AchievementRankingCard';
import { safeBack } from '@/utils/navigation';
import styles from './page.module.less';

function AchievementContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPC, setIsPC] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === 'undefined') return;
      setIsPC(window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const [inviteData] = useState({
    inviteLink: '',
    inviteCode: 'MOZI888',
    totalInvites: 0,
    earnedPoints: 0,
  });

  const copyToClipboard = async (text) => {
    const value = String(text || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      Toast.show({ content: t('pointsDetail.linkCopied', { defaultValue: '复制成功' }) });
    } catch (_) {
      Toast.show({ content: t('pointsDetail.copyFailed', { defaultValue: '复制失败' }) });
    }
  };

  return (
    <div className={styles.page}>
      {!isPC && (
        <NavBar
          title={t('pcLayout.menu.myAchievements', { defaultValue: '我的成就' })}
          showBack
          onBack={() => safeBack(router, { fallback: '/' })}
        />
      )}

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Mozi <span>Alpha Engine</span>
            </h1>
            <p className={styles.heroSubtitle}>Play · Earn · Build the Signal</p>
          </div>

          <div className={styles.scoreCard}>
            <div className={styles.scoreValue}>
              <img src="/point/new_coin.svg" alt="coin" className={styles.coinIcon} />
              <span>578223</span>
            </div>
            <button type="button" className={styles.recordBtn}>
              Record
            </button>
          </div>

          <div className={styles.heroDecor}>
            <img src="/point/ip.png" alt="mozi mascot" className={styles.ipImage} />
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.leftColumn}>
            <AchievementInviteCard pointsData={inviteData} copyToClipboard={copyToClipboard} />
            <AchievementOneTimeTasks />
            <AchievementMoreRewardsBanner />
            <AchievementDailyTasks />
          </div>

          <div className={styles.rightColumn}>
            <AchievementPoolStatusCard />
            <AchievementPoolEventCard />
                        <AchievementRankingCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AchievementPage() {
  return (
    <PCLayout>
      <AchievementContent />
    </PCLayout>
  );
}

