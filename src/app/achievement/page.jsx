'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Toast } from 'antd-mobile';
import NavBar from '@/components/NavBar';
import PCLayout from '@/components/PCLayout';
import { getPoolStatus, getTaskPoints, getInvitationList, getTaskList, completeTask } from '@/api/points';
import AchievementInviteCard from './AchievementInviteCard';
import AchievementOneTimeTasks from './AchievementOneTimeTasks';
import AchievementMoreRewardsBanner from './AchievementMoreRewardsBanner';
import AchievementDailyTasks from './AchievementDailyTasks';
import AchievementPoolStatusCard from './AchievementPoolStatusCard';
import AchievementPoolEventCard from './AchievementPoolEventCard';
import AchievementRankingCard from './AchievementRankingCard';
import EditProfilePopup from '@/app/user/components/EditProfilePopup';
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
  const [starterTasks, setStarterTasks] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [verifyingTaskId, setVerifyingTaskId] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [dailyTasksLoading, setDailyTasksLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileUserInfo, setEditProfileUserInfo] = useState({ isLogin: false, nickname: '', avatar: '' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('token');
      const raw = localStorage.getItem('userInfo');
      const parsed = raw ? JSON.parse(raw) : null;
      setEditProfileUserInfo({
        isLogin: Boolean(token),
        nickname: parsed?.nickName || parsed?.nickname || '',
        avatar: parsed?.avatar || '',
      });
    } catch {
      // ignore
    }
  }, []);
  const dailyTasksRef = useRef(null);
  const rankingWrapRef = useRef(null);
  const leftColumnRef = useRef(null);
  const rightColumnRef = useRef(null);
  const mainGridRef = useRef(null);

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

  const starterTaskIconMap = {
    FIRST_LOGIN: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/first_login.svg',
    COMPLETE_PROFILE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/user_info.svg',
    USER_INFO: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/user_info.svg',
    FIRST_POST: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/push.svg',
    PUSH: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/push.svg',
    ADD_WATCHLIST: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/add.svg',
    ADD: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/add.svg',
    SET_ALARM: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/setting_alert.svg',
    ALARM: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/setting_alert.svg',
    JOIN_COMMUNITY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/group.svg',
    COMMUNITY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/group.svg',
    EARLY_BIRD: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/eraly_bird.svg',
    FOLLOW_TWITTER: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/X.svg',
    TWITTER: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/X.svg',
  };

  const dailyTaskIconMap = {
    DAILY_LOGIN: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/daily_login.svg',
    DAILY_LIKE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/like.svg',
    POST: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/push_article.svg',
    REPLY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/reply.svg',
    POST_RECEIVE_REPLY: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/received.svg',
    SHARE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/shared.svg',
    RECEIVE_LIKE: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/received_like.svg',
  };

  const mapStarterBtnType = (taskCode) => {
    const code = String(taskCode || '').toUpperCase();
    if (code === 'FIRST_LOGIN') return 'firstLoginCompleted';
    if (code === 'COMPLETE_PROFILE' || code === 'USER_INFO') return 'profile';
    if (code === 'FIRST_POST' || code === 'PUSH') return 'post';
    if (code === 'ADD_WATCHLIST' || code === 'ADD') return 'add';
    if (code === 'SET_ALARM' || code === 'ALARM') return 'setup';
    if (code === 'JOIN_COMMUNITY' || code === 'COMMUNITY') return 'join';
    if (code === 'EARLY_BIRD') return 'login';
    if (code === 'FOLLOW_TWITTER' || code === 'TWITTER') return 'follow';
    return 'post';
  };

  const mapStarterActionLabel = (taskCode, completed) => {
    if (completed) return t('pointsDetail.completed', { defaultValue: 'Completed' });
    const code = String(taskCode || '').toUpperCase();
    if (code === 'FIRST_POST' || code === 'PUSH') return t('pointsDetail.tasks.push.button', { defaultValue: 'Post' });
    if (code === 'ADD_WATCHLIST' || code === 'ADD') return t('pointsDetail.tasks.add.button', { defaultValue: 'Add' });
    if (code === 'SET_ALARM' || code === 'ALARM') return t('pointsDetail.tasks.setAlarm.button', { defaultValue: 'Set' });
    if (code === 'JOIN_COMMUNITY' || code === 'COMMUNITY') return t('pointsDetail.tasks.joinCommunity.button', { defaultValue: 'Join' });
    if (code === 'EARLY_BIRD') return t('pointsDetail.tasks.earlyBird.button', { defaultValue: 'Claim' });
    if (code === 'FOLLOW_TWITTER' || code === 'TWITTER') return t('pointsDetail.tasks.followTwitter.button', { defaultValue: 'Follow' });
    return t('pointsDetail.check', { defaultValue: 'Check' });
  };

  const fetchAllTasks = useCallback(async () => {
    setTasksLoading(true);
    setDailyTasksLoading(true);
    try {
      const res = await getTaskList();
      if (res?.code !== 0 || !res?.data) {
        setStarterTasks([]);
        setDailyTasks([]);
        return;
      }

      const activityTasks = (res.data.activityTaskList || [])
        .filter((task) => !['WECHAT', 'INVITE_USER', 'VIDEO_LEARN', 'VIDEO'].includes(String(task?.taskCode || '').toUpperCase()))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((task, idx) => {
          const code = String(task.taskCode || '').toUpperCase();
          const completed = !!task.isCompleted;
          return {
            id: task.id || `${code}-${idx}`,
            taskCode: code,
            title: task.taskName || '',
            points: Number(task.rewardPoints || 0),
            completed,
            needsAction: !completed,
            action: mapStarterActionLabel(code, completed),
            btnType: mapStarterBtnType(code),
            icon: starterTaskIconMap[code] || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/first_login.svg',
          };
        });

      const dTasks = (res.data.dailyTaskList || [])
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((task, idx) => {
          const code = String(task.taskCode || '').toUpperCase();
          return {
            id: task.taskCode || idx + 1,
            taskCode: task.taskCode,
            title: task.taskName || '',
            rewardLabel: task.taskDesc,
            reward: task.rewardPoints || 0,
            current: task.currentProgress || 0,
            target: task.targetProgress || 1,
            completed: task.isCompleted || false,
            icon: dailyTaskIconMap[code] || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/glove_praise@2x.png',
          };
        });

      setStarterTasks(activityTasks);
      setDailyTasks(dTasks);
    } catch (error) {
      console.error('Failed to fetch achievement tasks:', error);
      setStarterTasks([]);
      setDailyTasks([]);
    } finally {
      setTasksLoading(false);
      setDailyTasksLoading(false);
    }
  }, [t]);

  useEffect(() => {
    hydrateInviteCodeFromStorage();
    fetchAchievementPoints();
    fetchAchievementInvites();
    fetchAllTasks();
  }, [fetchAchievementInvites, fetchAchievementPoints, hydrateInviteCodeFromStorage, fetchAllTasks]);

  const verifyStarterTask = useCallback(async (task) => {
    const code = String(task?.taskCode || '').toUpperCase();
    if (!code) return;
    try {
      setVerifyingTaskId(task.id);
      const res = await completeTask({ taskCode: code });
      if (res?.code === 0 && res?.data?.success) {
        fetchAllTasks();
        fetchAchievementPoints();
      } else {
        Toast.show({ content: res?.message || res?.msg || t('common.operationFailed') });
      }
    } catch (error) {
      console.error('Verify starter task failed:', error);
      Toast.show({ content: t('common.operationFailed') });
    } finally {
      setVerifyingTaskId(null);
    }
  }, [fetchAchievementPoints, fetchAllTasks, t]);

  const handleStarterTaskClick = useCallback((task) => {
    if (!task || task.completed || verifyingTaskId === task.id) return;
    if (!task.needsAction) {
      verifyStarterTask(task);
      return;
    }
    const code = String(task.taskCode || '').toUpperCase();
    switch (code) {
      case 'SET_ALARM':
      case 'ALARM':
        router.push(isPC ? '/pc/alarm?symbol=BTC' : '/addwarn?symbol=BTC');
        return;
      case 'FOLLOW_TWITTER':
      case 'TWITTER':
        window.open('https://x.com/moziinnovation', '_blank');
        setStarterTasks((prev) =>
          prev.map((item) =>
            item.id === task.id
              ? { ...item, needsAction: false, action: t('pointsDetail.check', { defaultValue: 'Check' }) }
              : item
          )
        );
        return;
      case 'JOIN_COMMUNITY':
      case 'COMMUNITY':
        window.open('https://t.me/MoziInnovations', '_blank');
        setStarterTasks((prev) =>
          prev.map((item) =>
            item.id === task.id
              ? { ...item, needsAction: false, action: t('pointsDetail.check', { defaultValue: 'Check' }) }
              : item
          )
        );
        return;
      case 'COMPLETE_PROFILE':
      case 'USER_INFO':
        if (isPC) {
          setEditProfileOpen(true);
          return;
        }
        router.push('/user/edit');
        return;
      case 'FIRST_POST':
      case 'PUSH':
        router.push(isPC ? '/pc/community' : '/community');
        return;
      case 'ADD_WATCHLIST':
      case 'ADD':
        router.push(isPC ? '/pc/find' : '/');
        return;
      default:
        verifyStarterTask(task);
    }
  }, [isPC, router, t, verifyStarterTask, verifyingTaskId]);

  const handleRankingInviteClick = async () => {
    const inviteCode = String(inviteData.inviteCode || '').trim();
    if (!inviteCode || typeof window === 'undefined') return;
    const shareUrl = new URL('/', window.location.origin);
    shareUrl.searchParams.set('inviteCode', inviteCode);
    await copyToClipboard(shareUrl.toString());
  };

  const handleDailyTaskClick = useCallback((task) => {
    const code = String(task?.taskCode || '').toUpperCase();
    if (['DAILY_LIKE', 'POST', 'REPLY', 'RECEIVE_LIKE', 'POST_RECEIVE_REPLY'].includes(code)) {
      router.push(isPC ? '/pc/community' : '/community');
      return;
    }
    if (code === 'SHARE') {
      handleRankingInviteClick();
    }
  }, [isPC, router]);

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
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/new_coin.svg" alt="coin" className={styles.coinIcon} />
              <span>{formatPoints(inviteData.totalPoints || 0)}</span>
            </div>
            <button
              type="button"
              className={styles.recordBtn}
              onClick={() => router.push('/pointshistory')}
            >
              {t('pointsHistory.title', { defaultValue: 'Record' })}
            </button>
          </div>

          <div className={styles.heroDecor}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/ip.png" alt="mozi mascot" className={styles.ipImage} />
          </div>
        </div>

        <div className={styles.mainGrid} ref={mainGridRef}>
          <div className={styles.leftColumn} ref={leftColumnRef}>
            <AchievementInviteCard pointsData={inviteData} copyToClipboard={copyToClipboard} />
            <AchievementOneTimeTasks
              tasks={starterTasks}
              onTaskClick={handleStarterTaskClick}
              verifyingTaskId={verifyingTaskId}
              loading={tasksLoading}
            />
            <AchievementMoreRewardsBanner />
            <div ref={dailyTasksRef}>
              <AchievementDailyTasks tasks={dailyTasks} onTaskClick={handleDailyTaskClick} loading={dailyTasksLoading} />
            </div>
          </div>

          <div className={styles.rightColumn} ref={rightColumnRef}>
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
            <div ref={rankingWrapRef} className={styles.rankingWrap}>
              <AchievementRankingCard
                onInviteClick={handleRankingInviteClick}
                style={isPC && rankingHeight ? { height: `${rankingHeight}px` } : undefined}
                noTopMargin={isPC}
              />
            </div>
          </div>
        </div>
      </div>

      <EditProfilePopup
        visible={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        t={t}
        userInfo={editProfileUserInfo}
        setUserInfo={setEditProfileUserInfo}
      />
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

