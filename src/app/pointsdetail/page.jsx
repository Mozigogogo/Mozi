'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from 'antd-mobile';
import { ClockCircleOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import InviteBanner from '@/components/InviteBanner';
import { request } from '../../utils/request';
import { Interface, getTgInviteLink } from '../../utils/constants';
import { getPoolStatus, getTaskPoints, getInvitationList, getTaskList, completeTask } from '../../api/points';
import styles from './page.module.less';

export default function PointsDetail() {
  const router = useRouter();
  
  // 防止重复调用的标记
  const isDataFetchedRef = useRef(false);
  const { t, i18n } = useTranslation();
  
  const isEnglish = i18n.language === 'en';
  const [pointsLoading, setPointsLoading] = useState(false);
  
  // 积分数据 state，初始使用默认值
  const [pointsData, setPointsData] = useState({
    totalPoints: 0,
    season: 'S6赛季', // Updated default
    seasonStart: '2026-02-27',
    seasonEnd: '2026-06-27',
    inviteLink: '',
    inviteCode: '',
    totalInvites: 0,
    earnedPoints: 0,
    activeInvites: 0,
    pendingRewards: 0,
    level: 1,
    maxLevel: 10,
    currentLevelPoints: 200,
    nextLevelPoints: 1000
  });

  const [poolStatus, setPoolStatus] = useState({
    remainingPoints: 0,
    totalCapacity: 1000000,
    totalPool: '4.23M', // Placeholder or from API
    remainingMineable: '7.65M', // Placeholder or from API
    estimatedDays: '12.8', // Placeholder or from API
    percent: 60
  });

  // Fetch pool status
  const fetchPoolStatusData = useCallback(async () => {
    try {
      const res = await getPoolStatus();
      if (res?.code === 0 && res?.data) {
        setPoolStatus(prev => ({
          ...prev,
          ...res.data,
          percent: res.data.remainingPoints && res.data.totalCapacity 
            ? Math.round((res.data.remainingPoints / res.data.totalCapacity) * 100) 
            : 60
        }));
      }
    } catch (error) {
      console.error('获取奖池状态失败:', error);
    }
  }, []);


  // 获取用户积分数据
  const fetchPointsData = useCallback(async () => {
    try {
      setPointsLoading(true);
      const res = await getTaskPoints();
      
      if (res?.code === 0 && res?.data) {
        const data = res.data;
        setPointsData(prev => ({
          ...prev,
          totalPoints: data.totalPoints ?? prev.totalPoints,
          dailyPoints: data.dailyPoints ?? 0,
          monthlyPoints: data.monthlyPoints ?? 0,
          inviteLink: data.inviteLink ?? prev.inviteLink,
          inviteCode: data.inviteCode ?? prev.inviteCode,
          totalInvites: data.totalInvites ?? prev.totalInvites,
          earnedPoints: data.earnedPoints ?? prev.earnedPoints,
          activeInvites: data.activeInvites ?? prev.activeInvites,
          pendingRewards: data.pendingRewards ?? prev.pendingRewards,
          seasonStart: data.seasonStart ?? prev.seasonStart,
          seasonEnd: data.seasonEnd ?? prev.seasonEnd
        }));
      }
    } catch (error) {
      console.error('获取积分数据失败:', error);
      Toast.show({
        content: t('pointsDetail.fetchFailed') || '获取积分数据失败',
        icon: 'fail'
      });
    } finally {
      setPointsLoading(false);
    }
  }, [t]);

  // 获取用户数据（含邀请码）- 从本地存储读取
  const fetchUserDataInfo = useCallback(() => {
    try {
      // 从 localStorage 读取 userDataInfo
      const storedData = localStorage.getItem('userDataInfo');
      
      if (storedData) {
        const data = JSON.parse(storedData);
        console.log('🔍 [DEBUG] 从本地读取用户数据:', data);
        
        setPointsData(prev => ({
          ...prev,
          inviteCode: data.inviteCode || data.invitationCode || prev.inviteCode,
        }));
      } else {
        console.log('⚠️ [DEBUG] 本地未找到 userDataInfo 数据');
      }
    } catch (error) {
      console.error('读取本地用户数据失败:', error);
    }
  }, []);

  // 获取邀请列表数据
  const fetchInvitationList = useCallback(async () => {
    try {
      const res = await getInvitationList();
      
      if (res?.code === 0 && res?.data) {
        const data = res.data;
        // 根据接口返回的邀请列表更新统计数据
        const invitations = data.invitations || data || [];
        setPointsData(prev => ({
          ...prev,
          inviteCode: data.invitationCode || prev.inviteCode,
          inviteLink: data.inviteLink || prev.inviteLink,
          totalInvites: data.totalInvites ?? invitations.length ?? prev.totalInvites,
          activeInvites: data.activeInvites ?? invitations.filter(i => i.status === 'active' || i.isActive).length ?? prev.activeInvites,
          earnedPoints: data.totalInvitePoints ?? data.earnedPoints ?? prev.earnedPoints,
          pendingRewards: data.pendingRewards ?? prev.pendingRewards
        }));
        console.log('邀请列表数据:', data);
      }
    } catch (error) {
      console.error('获取邀请列表失败:', error);
    }
  }, []);

  // 页面加载时获取所有数据（只执行一次）
  useEffect(() => {
    if (isDataFetchedRef.current) return;
    isDataFetchedRef.current = true;
    
    fetchPointsData();
    fetchUserDataInfo();
    fetchInvitationList();
    fetchAllTasks();
    fetchPoolStatusData();
  }, []);

  // 任务列表初始为空数组，等待接口返回数据
  const [tasksList, setTasksList] = useState([]);
  const [verifyingTaskId, setVerifyingTaskId] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  // 每日任务列表 state
  const [dailyInvestments, setDailyInvestments] = useState([
    { id: 1, title: '每日签到', titleKey: 'pointsDetail.dailySignIn', reward: 10, completed: true, icon: '/point/daily_login.svg', current: 1, target: 1, bgColor: 'rgba(248, 250, 252, 1)' },
    { id: 2, title: '每日点赞', titleKey: 'pointsDetail.dailyLike', reward: 3, completed: false, icon: '/point/like.svg', current: 3, target: 10, bgColor: 'rgba(255, 241, 242, 1)' },
    { id: 3, title: '发布观点', titleKey: 'pointsDetail.publishView', reward: 10, completed: false, icon: '/point/push_article.svg', current: 0, target: 5, bgColor: 'rgba(255, 247, 237, 1)' },
  ]);
  const [dailyTasksLoading, setDailyTasksLoading] = useState(true);

  // 任务类型到图标的映射
  const taskIconMap = {
    'REGISTER': '/point/first_login.svg',
    'FOLLOW_TWITTER': '/point/X.svg',
    'JOIN_COMMUNITY': '/point/group.svg',
    'COMMUNITY': '/point/group.svg',
    'EARLY_BIRD': '/point/eraly_bird.svg',
    'SET_ALARM': '/point/setting_alert.svg',
    'ALARM': '/point/setting_alert.svg',
    'VIDEO_LEARN': '/point/video@2x.png',
    'VIDEO': '/point/video@2x.png',
    'WECHAT': '/point/like@2x.png',
    'DAILY_LOGIN': '/point/daily_login.svg',
    'INVITE_USER': '/point/shared.svg',
    'USER_INFO': '/point/user_info.svg',
    'ADD': '/point/add.svg',
    'PUSH': '/point/push.svg',
  };

  // 任务类型到国际化 key 的映射（用于按钮文本）
  const taskKeyMap = {
    'REGISTER': 'firstRegister',
    'FOLLOW_TWITTER': 'followTwitter',
    'JOIN_COMMUNITY': 'joinCommunity',
    'COMMUNITY': 'joinCommunity',
    'EARLY_BIRD': 'earlyBird',
    'SET_ALARM': 'setAlarm',
    'ALARM': 'setAlarm',
    'VIDEO_LEARN': 'videoLearn',
    'VIDEO': 'videoLearn',
    'WECHAT': 'followTwitter',
    'DAILY_LOGIN': 'dailyLogin',
    'INVITE_USER': 'inviteUser',
    'USER_INFO': 'userInfo',
    'ADD': 'add',
    'PUSH': 'push',
  };

  // 每日任务图标映射
  const dailyTaskIconMap = {
    'DAILY_LIKE': '/point/like.svg',
    'POST': '/point/push_article.svg',
    'RECEIVE_LIKE': '/point/received_like.svg',
    'REPLY': '/point/reply.svg',
    'POST_RECEIVE_REPLY': '/point/received.svg',
    'DAILY_LOGIN': '/point/daily_login.svg',
    'SHARE': '/point/shared.svg',
  };

  // 任务图标背景色映射
  const taskBgColorMap = {
    // 新手任务
    'REGISTER': 'rgba(239, 246, 255, 1)', // 首次登录 #EFF6FF
    'FIRST_LOGIN': 'rgba(239, 246, 255, 1)', // 首次登录备用
    'USER_INFO': 'rgba(236, 253, 245, 1)', // 完善个人信息
    'PUSH': 'rgba(255, 247, 237, 1)', // 发布首篇帖子 (对应 PUSH?) - 或者是 POST? 假设 PUSH 是新手任务中的发布
    'FIRST_POST': 'rgba(255, 247, 237, 1)', // 发布首篇帖子备用
    'ADD': 'rgba(238, 242, 255, 1)', // 添加自选
    'ADD_WATCHLIST': 'rgba(238, 242, 255, 1)', // 添加自选备用
    'SET_ALARM': 'rgba(254, 242, 242, 1)', // 设置报警
    'ALARM': 'rgba(254, 242, 242, 1)',
    'JOIN_COMMUNITY': 'rgba(240, 253, 250, 1)', // 加入社群
    'COMMUNITY': 'rgba(240, 253, 250, 1)',
    'EARLY_BIRD': 'rgba(254, 252, 232, 1)', // 早鸟用户
    'FOLLOW_TWITTER': 'rgba(240, 240, 240, 1)', // 关注推特
    'WECHAT': 'rgba(240, 240, 240, 1)', // 关注推特备用
    
    // 每日任务
    'DAILY_LOGIN': 'rgba(248, 250, 252, 1)', // 每日登录
    'DAILY_LIKE': 'rgba(255, 241, 242, 1)', // 每日点赞
    'POST': 'rgba(255, 247, 237, 1)', // 发布帖子
    'REPLY': 'rgba(236, 254, 255, 1)', // 回复帖子
    'POST_RECEIVE_REPLY': 'rgba(245, 243, 255, 1)', // 帖子收到回复
    'SHARE': 'rgba(238, 242, 255, 1)', // 每日分享
    'RECEIVE_LIKE': 'rgba(255, 251, 235, 1)', // 帖子收到赞
    
    // 其他备用
    'VIDEO_LEARN': '#FFF0F6',
    'VIDEO': '#FFF0F6',
    'INVITE_USER': '#F9F0FF',
  };

  // 每日任务 Key 映射
  const dailyTaskKeyMap = {
    'DAILY_LIKE': 'dailyLike',
    'POST': 'post',
    'RECEIVE_LIKE': 'receiveLike',
    'REPLY': 'reply',
    'POST_RECEIVE_REPLY': 'postReceiveReply',
    'DAILY_LOGIN': 'dailyLogin',
  };

  // 获取任务列表（活动任务 + 每日任务，合并为一次接口调用）
  const fetchAllTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setDailyTasksLoading(true);
      const res = await getTaskList();
      
      console.log('🔍 [DEBUG] TASK_LIST 接口返回:', res);
      
      if (res?.code === 0 && res?.data) {
        // 处理活动任务 activityTaskList
        const activityTasks = res.data.activityTaskList || [];
        const mappedTasks = activityTasks
          .filter(task => 
            task.taskCode !== 'WECHAT' && 
            task.taskCode !== 'INVITE_USER' && 
            task.taskCode !== 'VIDEO_LEARN' && 
            task.taskCode !== 'VIDEO'
          )
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((task, index) => {
            const taskKey = taskKeyMap[task.taskCode] || 'setAlarm';
            return {
              id: task.id || index + 1,
              taskCode: task.taskCode,
              icon: taskIconMap[task.taskCode] || '/point/set_alert@2x.png',
              bgColor: taskBgColorMap[task.taskCode] || '#F5F7FA',
              title: task.taskName,
              titleKey: `pointsDetail.tasks.${taskKey}.title`,
              btnTextKey: `pointsDetail.tasks.${taskKey}.button`,
              points: task.rewardPoints || 0,
              status: task.isCompleted ? 'completed' : 'pending',
              needsAction: !task.isCompleted
            };
          });
        
        // 无论是否有数据都设置，空数组也设置
        setTasksList(mappedTasks);

        // 处理每日任务 dailyTaskList
        const dailyTasks = res.data.dailyTaskList || [];
        const mappedDailyTasks = dailyTasks
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((task, index) => {
            const taskKey = dailyTaskKeyMap[task.taskCode] || 'dailyLogin';
            return {
              id: task.taskCode || index + 1,
              icon: dailyTaskIconMap[task.taskCode] || '/point/glove_praise@2x.png',
              bgColor: taskBgColorMap[task.taskCode] || '#F5F7FA',
              title: task.taskName,
              titleKey: `pointsDetail.tasks.${taskKey}.title`,
              rewardLabel: task.taskDesc,
              reward: task.rewardPoints || 0,
              current: task.currentProgress || 0,
              target: task.targetProgress || 1,
              completed: task.isCompleted || false,
            };
          });
        
        // 无论是否有数据都设置，空数组也设置
        setDailyInvestments(mappedDailyTasks);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setTasksLoading(false);
      setDailyTasksLoading(false);
    }
  }, []);

  // 早鸟检查标记
  const isEarlyBirdCheckedRef = useRef(false);

  // 早鸟用户自动完成逻辑：2026年3月前注册登录的用户自动完成
  useEffect(() => {
    if (isEarlyBirdCheckedRef.current) return;
    isEarlyBirdCheckedRef.current = true;
    
    const checkEarlyBird = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const now = new Date();
      const deadline = new Date('2026-01-24T23:59:59');
      
      // 如果用户已登录且在截止日期前
      if (token && now <= deadline) {
        console.log('🔍 [DEBUG] 早鸟用户检查：已登录且在截止日期前，自动完成任务');
        try {
          const res = await completeTask({ taskCode: 'EARLY_BIRD' });
          console.log('🔍 [DEBUG] 早鸟任务自动完成结果:', res);
          
          if (res?.code === 0) {
            // 刷新任务列表和积分
            fetchAllTasks();
            fetchPointsData();
          }
        } catch (error) {
          console.error('早鸟任务自动完成失败:', error);
        }
      }
    };
    
    // 延迟执行，等待任务列表加载完成
    const timer = setTimeout(checkEarlyBird, 1000);
    return () => clearTimeout(timer);
  }, []);



  // 获取任务的原始按钮文本
  const getOriginalBtnText = (titleKey) => {
    // 从 titleKey 推导出对应的 btnTextKey
    const btnTextKey = titleKey.replace('.title', '.button');
    return t(btnTextKey);
  };

  // 验证任务完成 - 调用后端接口
  const verifyTask = async (task) => {
    try {
      setVerifyingTaskId(task.id);
      
      console.log('🔍 [DEBUG] 调用任务完成接口, taskCode:', task.taskCode);
      
      // 调用后端接口完成任务
      const res = await completeTask({
        taskCode: task.taskCode
      });
      
      console.log('🔍 [DEBUG] 任务完成接口返回:', res);
      
      if (res?.code === 0 && res?.data?.success) {
        // 验证成功，更新为已完成
        const updatedTasks = tasksList.map(t => 
          t.id === task.id 
            ? { ...t, status: 'completed', needsAction: false }
            : t
        );
        setTasksList(updatedTasks);
        
        // 保存到本地存储
        if (typeof window !== 'undefined') {
          localStorage.setItem('pointsTasks', JSON.stringify(updatedTasks));
        }
        
        // 显示成功提示，使用接口返回的消息或默认消息
        const successMsg = res?.data?.message || t('pointsDetail.messages.pointsEarned', { points: task.points });
        Toast.show({ content: successMsg, icon: 'success', position: 'center' });
        
        // 刷新积分数据
        fetchPointsData();
      } else {
        // 验证失败，恢复成原来的状态
        const updatedTasks = tasksList.map(t => 
          t.id === task.id 
            ? { ...t, needsAction: true }
            : t
        );
        setTasksList(updatedTasks);
        
        // 保存到本地存储
        if (typeof window !== 'undefined') {
          localStorage.setItem('pointsTasks', JSON.stringify(updatedTasks));
        }
        
        const errorMsg = res?.message || res?.msg || t('pointsDetail.messages.taskNotCompleted');
        Toast.show({ content: errorMsg, position: 'center' });
      }
    } catch (error) {
      console.error('任务完成接口调用失败:', error);
      
      // 验证出错时也恢复成原来的状态
      const updatedTasks = tasksList.map(t => 
        t.id === task.id 
          ? { ...t, needsAction: true }
          : t
      );
      setTasksList(updatedTasks);
      
      // 保存到本地存储
      if (typeof window !== 'undefined') {
        localStorage.setItem('pointsTasks', JSON.stringify(updatedTasks));
      }
      
      Toast.show({ content: t('pointsDetail.messages.verifyFailed'), position: 'center' });
    } finally {
      setVerifyingTaskId(null);
    }
  };

  const handleTaskClick = (task) => {
    // 如果任务已完成，不处理
    if (task.status === 'completed') {
      Toast.show({ content: t('pointsDetail.taskCompleted'), position: 'bottom' });
      return;
    }

    // 如果正在验证中，不处理
    if (verifyingTaskId === task.id) {
      return;
    }

    // 如果是验证状态（needsAction为false），直接调用完成接口
    if (!task.needsAction) {
      verifyTask(task);
      return;
    }

    // 根据 taskCode 处理不同任务的跳转
    switch (task.taskCode) {
      case 'ALARM':
        router.push('/addwarn?symbol=BTC');
        break;
      case 'VIDEO':
        // 检查是否所有视频都看完了
        const videoTotal = parseInt(localStorage.getItem('videoLearnTotal') || '3');
        const completedVideos = JSON.parse(localStorage.getItem('completedVideos') || '{}');
        const completedCount = Object.keys(completedVideos).filter(k => completedVideos[k]).length;
        
        if (completedCount >= videoTotal) {
          // 所有视频都看完了，直接调用完成接口
          verifyTask(task);
          return;
        } else {
          // 还有视频没看完，跳转到视频学习页面
          Toast.show({ 
            content: t('pointsDetail.messages.videosRemaining', { count: videoTotal - completedCount }), 
            position: 'bottom' 
          });
          router.push('/videolearn');
        }
        break;
      case 'WECHAT':
      case 'TWITTER':
        // 关注 Twitter 官方账号
        window.open('https://x.com/Innovation56171', '_blank');
        break;
      case 'COMMUNITY':
        window.open('https://t.me/MoziInnovations', '_blank');
        break;
      case 'EARLY_BIRD':
        // 早鸟活动：检查是否注册，已登录则自动完成
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          Toast.show({ content: t('pointsDetail.pleaseRegister'), position: 'bottom' });
          router.push('/user?mode=register');
        } else {
          // 已登录，直接调用完成接口
          verifyTask(task);
          return; // 不需要标记为待验证状态
        }
        break;
      case 'INVITE_USER':
        // 邀请好友 - 复制 TG 邀请链接
        const tgLink = getTgInviteLink(pointsData.inviteCode);
        if (tgLink) {
          navigator.clipboard.writeText(tgLink);
          Toast.show({ content: t('pointsDetail.linkCopied'), position: 'bottom' });
        }
        break;
      case 'COMPLETE_PROFILE':
        router.push('/user/edit');
        break;
      case 'FIRST_POST':
        router.push('/community');
        break;
      case 'ADD_WATCHLIST':
        router.push('/');
        break;
      case 'FIRST_LOGIN':
        verifyTask(task);
        break;
      default:
        Toast.show({ content: t('pointsDetail.historyFeatureInDevelopment'), position: 'bottom' });
    }

    // 标记为待验证状态
    const updatedTasks = tasksList.map(t => 
      t.id === task.id 
        ? { ...t, needsAction: false }
        : t
    );
    setTasksList(updatedTasks);
  };

  const copyToClipboard = (text, label) => {
    // 优先使用 navigator.clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        Toast.show({ content: t('pointsDetail.linkCopied'), position: 'bottom' });
      }).catch(() => {
        // 降级方案
        fallbackCopy(text);
      });
    } else {
      // 降级方案
      fallbackCopy(text);
    }
  };

  // 降级复制方案（兼容 TG 小程序）
  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        Toast.show({ content: t('pointsDetail.linkCopied'), position: 'bottom' });
      } else {
        Toast.show({ content: t('pointsDetail.copyFailed'), position: 'bottom', icon: 'fail' });
      }
    } catch (err) {
      Toast.show({ content: t('pointsDetail.copyFailed'), position: 'bottom', icon: 'fail' });
    }
  };

  return (
    <div className={styles.pointsDetailContainer}>
      {/* NavBar 导航 */}
      <NavBar 
        title={t('pointsDetail.centerTitle') || '积分中心'} 
        backgroundColor="transparent"
        style={{ 
          background: "url('/point/point_bg.png') no-repeat top center",
          backgroundSize: "100% auto"
        }}
        showBorder={false}
        onBack={() => router.back()}
      />
      
      {/* 页面标题 */}
      <div className={styles.pageTitle}>
        {t('pointsDetail.myPoints') || '我的积分'}
      </div>

      {/* 赛季卡片 */}
      <div className={styles.seasonCard}>
        <div className={styles.seasonHeader}>
          <div className={styles.seasonInfo}>
            <div className={styles.treasuryTitle}>MOZI积分金库</div>
            <div className={styles.treasurySubtitle}>为您的Web3之旅注入动力</div>
          </div>
        </div>
        
        <div className={styles.pointsRow}>
          <div className={styles.totalPoints}>
            <img src="/point/coin_icon@2x.png" alt="Coin" className={styles.coinIcon} />
            <span>{pointsData.totalPoints}</span>
          </div>
          <button className={styles.historyBtn} onClick={() => router.push('/pointshistory')}>
            {t('pointsDetail.historyRecord') || '历史记录'}
          </button>
        </div>
        
        <img src="/point/link.png" className={styles.linkImage} alt="Link" />
        <img src="/point/link.png" className={styles.linkImageRight} alt="Link" />
      </div>

      {/* 本月积分池状态 */}
      <div className={styles.poolCard}>
        <div className={styles.poolHeader}>
          <span className={styles.poolTitle}>{t('pointsDetail.poolTitleText') || '本月积分池状态'}</span>
          <span className={styles.poolTagSufficient}>
             <img src="/point/supply_volume.svg" alt="" />
              {t('pointsDetail.poolSufficient') || '充足'}
          </span>
        </div>
        
        <div className={styles.poolProgressSection}>
          <div className={styles.poolPercentRow}>
            <span className={styles.poolPercentText}>{poolStatus.percent}%</span>
            <span className={styles.poolRemainingLabel}>{t('pointsDetail.poolRemaining') || '剩余积分'}</span>
          </div>
          <div className={styles.poolProgressBarContainer}>
            <div className={styles.poolProgressBar}>
              <div 
                className={`${styles.poolProgressFill} ${poolStatus.percent > 30 ? styles.fillNormal : styles.fillAlert}`} 
                style={{ width: `${poolStatus.percent}%` }}
              ></div>
              {poolStatus.percent > 30 && <div className={styles.separators}></div>}
            </div>
            <div className={styles.poolProgressScales}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className={styles.poolStatsGrid}>
          <div className={styles.poolStatBox}>
            <div className={styles.statLabel}>{t('pointsDetail.poolDistributed') || '已发放'}</div>
            <div className={styles.statValue}>{poolStatus.totalPool || '4.23M'}</div>
          </div>
          <div className={styles.poolStatBox}>
            <div className={styles.statLabel}>{t('pointsDetail.poolMineable') || '剩余可领'}</div>
            <div className={styles.statValue}>{poolStatus.remainingMineable || '7.65M'}</div>
          </div>
        </div>

        <div className={styles.poolCountdownSection}>
          <div className={styles.countdownHeader}>
            <ClockCircleOutline className={styles.clockIcon} />
            <span>{t('pointsDetail.poolResetCountdown') || '距离下月重置'}</span>
          </div>
          <div className={styles.countdownBoxes}>
            <div className={styles.countdownItem}>
              <div className={styles.countdownBox}>{Math.floor(Number(poolStatus.estimatedDays) || 0)}</div>
              <div className={styles.countdownLabel}>{t('pointsDetail.poolDays') || '天'}</div>
            </div>
            <div className={styles.countdownSeparator}>:</div>
            <div className={styles.countdownItem}>
              <div className={styles.countdownBox}>{Math.floor(((Number(poolStatus.estimatedDays) || 0) % 1) * 24).toString().padStart(2, '0')}</div>
              <div className={styles.countdownLabel}>{t('pointsDetail.poolHours') || '时'}</div>
            </div>
            <div className={styles.countdownSeparator}>:</div>
            <div className={styles.countdownItem}>
              <div className={styles.countdownBox}>{Math.floor(((((Number(poolStatus.estimatedDays) || 0) % 1) * 24) % 1) * 60).toString().padStart(2, '0')}</div>
              <div className={styles.countdownLabel}>{t('pointsDetail.poolMinutes') || '分'}</div>
            </div>
          </div>
        </div>

        <div className={styles.poolEventBanner}>
          <div className={styles.eventHeader}>
            <img src="/point/gift.svg" alt="Gift" className={styles.eventIcon} />
            <span className={styles.eventTitle}>{t('pointsDetail.poolEventTitle') || '周末积分加倍活动!'}</span>
            <span className={styles.eventTag}>HOT</span>
          </div>
          <div className={styles.eventList}>
            <div className={styles.eventItem}>
              <img src="/point/star.svg" alt="Star" className={styles.starIcon} />
              <span>
                {t('pointsDetail.poolEventDesc1_part1') || '所有任务奖励'}
                <span className={styles.highlightText}>{t('pointsDetail.poolEventDesc1_highlight') || 'x1.5倍'}</span>
                {t('pointsDetail.poolEventDesc1_part2') || ' (发帖10积分→15积分)'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <img src="/point/star.svg" alt="Star" className={styles.starIcon} />
              <span>
                {t('pointsDetail.poolEventDesc2_part1') || '活动时间：本周末48小时(还剩 '}
                <span className={styles.highlightText}>{t('pointsDetail.poolEventDesc2_highlight') || '42小时'}</span>
                {t('pointsDetail.poolEventDesc2_part2') || ' )'}
              </span>
            </div>
            <div className={styles.eventItem}>
              <img src="/point/star.svg" alt="Star" className={styles.starIcon} />
              <span>{t('pointsDetail.poolEventDesc3') || '积分充足，抓紧领取，机不可失!'}</span>
            </div>
          </div>
        </div>

        <button className={styles.upgradeBtn}>
          <img src="/point/vip.svg" alt="Crown" className={styles.crownIcon} />
          {t('pointsDetail.poolUpgradeMember') || '升级会员'}
        </button>
      </div>

      {/* 邀请有奖 */}
      <div className={styles.inviteCard}>
        <div className={styles.inviteCardHeader}>
          <img src="/point/invite_icon.svg" className={styles.inviteIcon} alt="Invite" />
          <div className={styles.inviteTitleContainer}>
            <span className={styles.inviteTitle}>{t('pointsDetail.inviteRewards')}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="70" height="5" viewBox="0 0 70 5" fill="none" className={styles.inviteTitleUnderline}>
              <path d="M0 2.5C0 1.11929 1.11929 0 2.5 0H67.5C68.8807 0 70 1.11929 70 2.5C70 3.88071 68.8807 5 67.5 5H2.5C1.11929 5 0 3.88071 0 2.5Z" fill="#FCCB37"/>
            </svg>
          </div>
        </div>
        
        <div className={styles.inviteRewardTypes}>
          <div className={styles.inviteRewardType}>
            <div className={styles.rewardIconBg}>
              <img src="/point/invite_register.png" alt="Register" />
            </div>
            <div className={styles.rewardText}>
              <div className={styles.rewardTitle}>{t('pointsDetail.inviteRegister')}</div>
              <div className={styles.rewardValue}>+250</div>
            </div>
          </div>
          <div className={styles.inviteRewardType}>
            <div className={styles.rewardIconBg}>
              <img src="/point/invite_pay.png" alt="Pay" />
            </div>
            <div className={styles.rewardText}>
              <div className={styles.rewardTitle}>{t('pointsDetail.invitePay')}</div>
              <div className={styles.rewardValue}>+500</div>
            </div>
          </div>
        </div>

        <div className={styles.inviteInputContainer}>
          <span className={styles.inviteInputLabel}>{t('pointsDetail.inviteLink')}</span>
          <div className={styles.inviteInputWrapper}>
            <div className={styles.inviteLinkText}>{pointsData.inviteLink || `https://t.me/MoziBot?start=${pointsData.inviteCode}`}</div>
            <button className={styles.copyBtn} onClick={() => copyToClipboard(pointsData.inviteLink || `https://t.me/MoziBot?start=${pointsData.inviteCode}`)}>
              <img src="/point/copy.svg" alt="Copy" />
            </button>
          </div>
        </div>

        <div className={styles.inviteInputContainer}>
          <span className={styles.inviteInputLabel}>{t('pointsDetail.inviteCode')}</span>
          <div className={styles.inviteInputWrapper}>
            <div className={styles.inviteLinkText}>{pointsData.inviteCode || 'MOZI888'}</div>
            <button className={styles.copyBtn} onClick={() => copyToClipboard(pointsData.inviteCode || 'MOZI888')}>
              <img src="/point/copy.svg" alt="Copy" />
            </button>
          </div>
        </div>

        <div className={styles.inviteStatsGrid}>
          <div className={styles.inviteStatBox}>
            <div className={styles.inviteStatValue}>{pointsData.totalInvites || 0}</div>
            <div className={styles.inviteStatLabel}>{t('pointsDetail.shareCount')}</div>
          </div>
          <div className={styles.inviteStatBox}>
            <div className={styles.inviteStatValue2}>{pointsData.earnedPoints || 0}</div>
            <div className={styles.inviteStatLabel}>{t('pointsDetail.totalEarned')}</div>
          </div>
        </div>

        <div className={styles.inviteRules}>
          <p>{t('pointsDetail.inviteRules.1')}</p>
          <p>{t('pointsDetail.inviteRules.2')}</p>
          <p>{t('pointsDetail.inviteRules.3')}</p>
          <p>{t('pointsDetail.inviteRules.4')}</p>
        </div>
      </div>

      {/* 新手任务 */}
      <div className={styles.taskListSection}>
        <div className={styles.inviteCardHeader}>
          <img src="/point/new_alert.svg" className={styles.inviteIcon} alt="Task" />
          <div className={styles.inviteTitleContainer}>
            <span className={styles.inviteTitle}>{t('pointsDetail.newbieTasks')}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="70" height="5" viewBox="0 0 70 5" fill="none" className={styles.inviteTitleUnderline}>
              <path d="M0 2.5C0 1.11929 1.11929 0 2.5 0H67.5C68.8807 0 70 1.11929 70 2.5C70 3.88071 68.8807 5 67.5 5H2.5C1.11929 5 0 3.88071 0 2.5Z" fill="#FCCB37"/>
            </svg>
          </div>
        </div>
        <div className={styles.taskList}>
          {tasksList.map(task => (
            <div key={task.id} className={styles.taskItem}>
              <div className={styles.taskIconWrapper} style={{ backgroundColor: task.bgColor }}>
                <img src={task.icon} alt={task.title} className={styles.taskIconImg} />
              </div>
              <div className={styles.taskInfo}>
                <div className={styles.taskName}>{t(task.titleKey) || task.title}</div>
                <div className={styles.dailyTaskReward}>
                  <span>+{task.points}</span>
                  <img src="/point/coin_icon@2x.png" className={styles.rewardIcon} alt="point" />
                </div>
              </div>
              <button 
                className={`${styles.taskBtn} ${task.status === 'completed' ? styles.completed : ''}`}
                onClick={() => handleTaskClick(task)}
              >
                {task.status === 'completed' ? t('pointsDetail.completed') : (t(task.btnTextKey) || t('pointsDetail.goFinish'))}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <InviteBanner style={{ width: '100%', height: 'auto' }} />
      </div>

      {/* 每日任务 */}
      <div className={styles.taskListSection}>
        <div className={styles.inviteCardHeader}>
          <img src="/point/task_daily.svg" className={styles.inviteIcon} alt="Task" />
          <div className={styles.inviteTitleContainer}>
            <span className={styles.inviteTitle}>{t('pointsDetail.dailyTasks')}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="70" height="5" viewBox="0 0 70 5" fill="none" className={styles.inviteTitleUnderline}>
              <path d="M0 2.5C0 1.11929 1.11929 0 2.5 0H67.5C68.8807 0 70 1.11929 70 2.5C70 3.88071 68.8807 5 67.5 5H2.5C1.11929 5 0 3.88071 0 2.5Z" fill="#FCCB37"/>
            </svg>
          </div>
        </div>
        <div className={styles.taskList}>
          {dailyInvestments.map(task => (
            <div key={task.id} className={styles.dailyTaskItem}>
              <div className={styles.dailyTaskIconWrapper} style={{ backgroundColor: task.bgColor }}>
                <img src={task.icon} alt={task.title} />
              </div>
              <div className={styles.dailyTaskContent}>
                <div className={styles.dailyTaskTitle}>{t(task.titleKey) || task.title}</div>
                <div className={styles.dailyTaskReward}>
                  <span>+{task.reward}</span>
                  <img src="/point/coin_icon@2x.png" className={styles.rewardIcon} alt="point" />
                </div>
                <div className={styles.progressBarContainer}>
                  <div className={styles.progressTrack}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${Math.min((task.current / task.target) * 100, 100)}%` }}
                    >
                      <div className={styles.progressKnob}>{task.current}</div>
                    </div>
                  </div>
                  <div className={styles.progressText}>{task.current}/{task.target}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部功能按钮 */}
      <div className={styles.actionButtonsGrid}>
        <button className={styles.actionButton}>
          <img src="/point/alert_alarm.svg" alt="Alarm" />
          <div className={styles.actionButtonContent}>
            <span className={styles.actionButtonTitle}>{t('pointsDetail.addAlarm')}</span>
            <span className={styles.actionButtonSubtitle}>Add an alarm</span>
          </div>
        </button>
        <button className={styles.actionButton}>
          <img src="/point/certification.png" alt="Cert" />
          <div className={styles.actionButtonContent}>
            <span className={styles.actionButtonTitle}>{t('pointsDetail.certification')}</span>
            <span className={styles.actionButtonSubtitle}>Certification</span>
          </div>
        </button>
      </div>
      
    </div>
  );
}

