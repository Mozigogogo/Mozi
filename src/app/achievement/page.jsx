'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import NavBar from '@/components/NavBar';
import PCLayout from '@/components/PCLayout';
import { getPoolStatus, getTaskPoints, getInvitationList } from '@/api/points';
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

  const [inviteData, setInviteData] = useState({
    inviteLink: '',
    inviteCode: '',
    totalInvites: 0,
    earnedPoints: 0,
    totalPoints: 0,
  });
  const [poolStatus, setPoolStatus] = useState({
    percent: 60,
    mode: 'NORMAL',
    totalPool: '4.23M',
    remainingMineable: '7.65M',
    resetTimestamp: null,
  });
  const [countdown, setCountdown] = useState({ days: 12, hours: 8, minutes: 45 });
  const [weekendRemainingHours, setWeekendRemainingHours] = useState(42);
  const [rankingHeight, setRankingHeight] = useState(null);
  const dailyTasksRef = useRef(null);
  const rankingWrapRef = useRef(null);

  const formatPoints = useCallback((value) => {
    if (value === undefined || value === null) return '0';
    return Number(value).toLocaleString();
  }, []);

  const fetchPoolStatusData = useCallback(async () => {
    try {
      const res = await getPoolStatus();
      if (res?.code === 0 && res?.data) {
        const data = res.data;
        const percent =
          data.remainingPoints && data.totalCapacity
            ? Math.round((data.remainingPoints / data.totalCapacity) * 100)
            : 0;
        setPoolStatus((prev) => ({
          ...prev,
          ...data,
          percent,
          totalPool: formatPoints(data.issuedPoints || 0),
          remainingMineable: formatPoints(data.remainingPoints || 0),
          mode: data.mode || 'NORMAL',
          resetTimestamp: data.resetTimestamp || null,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch pool status:', error);
    }
  }, [formatPoints]);

  const fetchAchievementPoints = useCallback(async () => {
    try {
      const res = await getTaskPoints();
      if (res?.code === 0 && res?.data) {
        const data = res.data;
        setInviteData((prev) => ({
          ...prev,
          totalPoints: data.totalPoints ?? prev.totalPoints,
          inviteLink: data.inviteLink ?? prev.inviteLink,
          inviteCode: data.inviteCode ?? prev.inviteCode,
          totalInvites: data.totalInvites ?? prev.totalInvites,
          earnedPoints: data.earnedPoints ?? prev.earnedPoints,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch achievement points:', error);
    }
  }, []);

  const fetchAchievementInvites = useCallback(async () => {
    try {
      const res = await getInvitationList();
      if (res?.code === 0 && res?.data) {
        const data = res.data;
        const invitations = data.invitations || data || [];
        setInviteData((prev) => ({
          ...prev,
          inviteCode: data.invitationCode || prev.inviteCode,
          inviteLink: data.inviteLink || prev.inviteLink,
          totalInvites: data.totalInvites ?? invitations.length ?? prev.totalInvites,
          earnedPoints: data.totalInvitePoints ?? data.earnedPoints ?? prev.earnedPoints,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch achievement invite list:', error);
    }
  }, []);

  const hydrateInviteCodeFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('userDataInfo');
      if (!stored) return;
      const data = JSON.parse(stored);
      setInviteData((prev) => ({
        ...prev,
        inviteCode: data.inviteCode || data.invitationCode || prev.inviteCode,
      }));
    } catch (error) {
      console.error('Failed to read userDataInfo:', error);
    }
  }, []);

  useEffect(() => {
    fetchPoolStatusData();
  }, [fetchPoolStatusData]);

  useEffect(() => {
    hydrateInviteCodeFromStorage();
    fetchAchievementPoints();
    fetchAchievementInvites();
  }, [fetchAchievementInvites, fetchAchievementPoints, hydrateInviteCodeFromStorage]);

  useEffect(() => {
    if (!poolStatus.resetTimestamp) return;
    const targetEndTime = Date.now() + Number(poolStatus.resetTimestamp);
    const updateCountdown = () => {
      const remaining = targetEndTime - Date.now();
      if (remaining <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown({ days, hours, minutes });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [poolStatus.resetTimestamp]);

  useEffect(() => {
    const calculateWeekendHours = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        setWeekendRemainingHours(0);
        return;
      }
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + (dayOfWeek === 0 ? 1 : 2));
      nextMonday.setHours(0, 0, 0, 0);
      const diffMs = nextMonday.getTime() - now.getTime();
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      setWeekendRemainingHours(hours > 0 ? hours : 0);
    };

    calculateWeekendHours();
    if (String(poolStatus.mode || '').toUpperCase() === 'BOOST') {
      const timer = setInterval(calculateWeekendHours, 1000 * 60 * 60);
      return () => clearInterval(timer);
    }
  }, [poolStatus.mode]);

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

  const handleRankingInviteClick = async () => {
    const inviteCode = String(inviteData.inviteCode || '').trim();
    if (!inviteCode || typeof window === 'undefined') return;
    const shareUrl = new URL('/', window.location.origin);
    shareUrl.searchParams.set('inviteCode', inviteCode);
    await copyToClipboard(shareUrl.toString());
  };

  useEffect(() => {
    if (!isPC) return;
    const updateRankingHeight = () => {
      const dailyTasksBottom = dailyTasksRef.current?.getBoundingClientRect?.().bottom || 0;
      const rankingTop = rankingWrapRef.current?.getBoundingClientRect?.().top || 0;
      if (!dailyTasksBottom || !rankingTop) return;
      const nextHeight = Math.max(Math.floor(dailyTasksBottom - rankingTop), 280);
      setRankingHeight(nextHeight);
    };

    updateRankingHeight();
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateRankingHeight())
        : null;
    if (dailyTasksRef.current) observer?.observe(dailyTasksRef.current);
    if (rankingWrapRef.current) observer?.observe(rankingWrapRef.current);
    window.addEventListener('resize', updateRankingHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateRankingHeight);
    };
  }, [isPC]);

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
              <span>{formatPoints(inviteData.totalPoints || 0)}</span>
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
            <div ref={dailyTasksRef}>
              <AchievementDailyTasks />
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.rightTopSection}>
              <AchievementPoolStatusCard
                mode={poolStatus.mode}
                percent={poolStatus.percent}
                totalAwarded={poolStatus.totalPool}
                pointsBalance={poolStatus.remainingMineable}
                countdown={{ day: countdown.days, hour: countdown.hours, second: countdown.minutes }}
              />
              <AchievementPoolEventCard mode={poolStatus.mode} remainingHours={weekendRemainingHours} />
            </div>
            <div ref={rankingWrapRef}>
              <AchievementRankingCard
                onInviteClick={handleRankingInviteClick}
                style={isPC && rankingHeight ? { height: `${rankingHeight}px` } : undefined}
              />
            </div>
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

