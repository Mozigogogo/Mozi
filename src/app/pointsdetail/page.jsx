'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import InviteBanner from '@/components/InviteBanner';
import { getPoolStatus, getTaskPoints, getInvitationList, getTaskList, completeTask } from '../../api/points';
import { getTgInviteLink } from '../../utils/constants';
import { safeBack } from '@/utils/navigation';
import styles from './page.module.less';

// Components
import SeasonCard from '@/components/pointsdetail/SeasonCard';
import PoolStatusCard from '@/components/pointsdetail/PoolStatusCard';
import InviteCard from '@/components/pointsdetail/InviteCard';
import NewbieTasks from '@/components/pointsdetail/NewbieTasks';
import DailyTasks from '@/components/pointsdetail/DailyTasks';
import ActionButtons from '@/components/pointsdetail/ActionButtons';

export default function PointsDetail() {
  const router = useRouter();
  
  // 防止重复调用的标记
  const isDataFetchedRef = useRef(false);
  const { t, i18n } = useTranslation();

  const enableDebugLog = (() => {
    try {
      if (process.env.NODE_ENV !== 'production') return true;
      return new URLSearchParams(window.location.search).get('pointsDebug') === '1';
    } catch (_) {
      return false;
    }
  })();

  const debugLog = (...args) => {
    if (!enableDebugLog) return;
    // eslint-disable-next-line no-console
    console.log(...args);
  };

  const scheduleLowPriority = (fn) => {
    try {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => fn(), { timeout: 1500 });
        return;
      }
    } catch (_) {}
    setTimeout(() => fn(), 0);
  };
  
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
    remainingPoints: 2400000,
    totalCapacity: 2400000,
    totalPool: '0', // Placeholder or from API
    remainingMineable: '2400000', // Placeholder or from API
    estimatedDays: '30', // Placeholder or from API
    percent: 100,
    mode: 'NORMAL',
    resetTimestamp: null
  });

  // 格式化数值显示
  const formatPoints = (value) => {
    if (value === undefined || value === null) return '0';
    return Number(value).toLocaleString();
  };

  // Fetch pool status
  const fetchPoolStatusData = useCallback(async () => {
    try {
      const res = await getPoolStatus();
      if (res?.code === 0 && res?.data) {
        const data = res.data;
        // 计算剩余百分比：使用 remainingPoints / totalCapacity 更加精准
        const percent = data.remainingPoints && data.totalCapacity 
          ? Math.round((data.remainingPoints / data.totalCapacity) * 100) 
          : 0;

        debugLog('Pool Status:', {
          total: data.totalCapacity,
          remaining: data.remainingPoints,
          issued: data.issuedPoints,
          percent: percent,
          mode: data.mode
        });

        // 直接使用接口返回的 mode，这里暂时手动切换到 SCARCE 模式用于展示
        const mode = data.mode || 'NORMAL';

        setPoolStatus(prev => ({
          ...prev,
          ...data,
          percent: percent,
          totalPool: formatPoints(data.issuedPoints || 0),
          remainingMineable: formatPoints(data.remainingPoints),
          estimatedDays: data.daysToReset || 0,
          mode: mode
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
        content: t('pointsDetail.fetchFailed'),
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
        debugLog('🔍 [DEBUG] 从本地读取用户数据:', data);
        
        setPointsData(prev => ({
          ...prev,
          inviteCode: data.inviteCode || data.invitationCode || prev.inviteCode,
        }));
      } else {
        debugLog('⚠️ [DEBUG] 本地未找到 userDataInfo 数据');
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
        debugLog('邀请列表数据:', data);
      }
    } catch (error) {
      console.error('获取邀请列表失败:', error);
    }
  }, []);

  // 页面加载时获取所有数据（只执行一次）
  useEffect(() => {
    if (isDataFetchedRef.current) return;
    isDataFetchedRef.current = true;
    
    // 首屏优先：先拿到用户积分总览，尽快可交互
    fetchPointsData();
    fetchUserDataInfo();

    // 次要信息延后：TG WebView 主线程紧张时先让 UI 跑起来
    scheduleLowPriority(() => fetchInvitationList());
    scheduleLowPriority(() => fetchAllTasks());
    scheduleLowPriority(() => fetchPoolStatusData());
  }, []);

  // 任务列表初始为空数组，等待接口返回数据
  const [tasksList, setTasksList] = useState([]);
  const [verifyingTaskId, setVerifyingTaskId] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  // 每日任务列表 state
  const [dailyInvestments, setDailyInvestments] = useState([]);
  const [dailyTasksLoading, setDailyTasksLoading] = useState(true);
  
  // 用于控制是否显示 loading（只在首次加载时显示）
  const isFirstTaskLoadRef = useRef(true);

  // 倒计时状态
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [weekendRemainingHours, setWeekendRemainingHours] = useState(0);

  // 计算周末剩余小时数
  useEffect(() => {
    const calculateWeekendHours = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
      
      // 如果不是周末（周六或周日），返回0
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        setWeekendRemainingHours(0);
        return;
      }

      // 计算到下周一 00:00:00 的剩余时间
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + (dayOfWeek === 0 ? 1 : 2));
      nextMonday.setHours(0, 0, 0, 0);
      
      const diffMs = nextMonday.getTime() - now.getTime();
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      setWeekendRemainingHours(hours > 0 ? hours : 0);
    };

    calculateWeekendHours();
    // 每小时更新一次，或者当 mode 为 BOOST 时更新
    if (poolStatus.mode === 'BOOST') {
      const timer = setInterval(calculateWeekendHours, 1000 * 60 * 60);
      return () => clearInterval(timer);
    }
  }, [poolStatus.mode]);

  // 计算倒计时
  useEffect(() => {
    if (!poolStatus.resetTimestamp) return;

    // 记录目标结束时间：当前时间 + 剩余时长
    // 注意：这里假设 resetTimestamp 是接口返回的剩余毫秒数
    const targetEndTime = Date.now() + Number(poolStatus.resetTimestamp);

    const calculateCountdown = () => {
      const now = Date.now();
      const remaining = targetEndTime - now;

      if (remaining > 0) {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        setCountdown({ days, hours, minutes });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
      }
    };

    calculateCountdown();
    // 每秒更新一次，确保倒计时流畅
    const timer = setInterval(calculateCountdown, 1000);

    return () => clearInterval(timer);
  }, [poolStatus.resetTimestamp]);

  // 任务类型到图标的映射
  const taskIconMap = {
    'REGISTER': '/point/first_login.svg',
    'FIRST_LOGIN': '/point/first_login.svg',
    'FOLLOW_TWITTER': '/point/X.svg',
    'TWITTER': '/point/X.svg',
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
    'COMPLETE_PROFILE': '/point/user_info.svg',
    'ADD': '/point/add.svg',
    'ADD_WATCHLIST': '/point/add.svg',
    'PUSH': '/point/push.svg',
    'FIRST_POST': '/point/push.svg',
  };

  // 任务类型到国际化 key 的映射（用于按钮文本）
  const taskKeyMap = {
    'REGISTER': 'firstRegister',
    'FIRST_LOGIN': 'firstRegister',
    'FOLLOW_TWITTER': 'followTwitter',
    'TWITTER': 'followTwitter',
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
    'COMPLETE_PROFILE': 'userInfo',
    'ADD': 'add',
    'ADD_WATCHLIST': 'add',
    'PUSH': 'push',
    'FIRST_POST': 'push',
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
    'SHARE': 'share',
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
              isCompleted: !!task.isCompleted,
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
      // 只在首次加载时关闭 loading
      if (isFirstTaskLoadRef.current) {
        setTasksLoading(false);
        setDailyTasksLoading(false);
        isFirstTaskLoadRef.current = false; // 标记首次加载完成
      }
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
            ? { ...t, isCompleted: true, status: 'completed', needsAction: false }
            : t
        );
        setTasksList(updatedTasks);
        
        // 保存到本地存储
        if (typeof window !== 'undefined') {
          localStorage.setItem('pointsTasks', JSON.stringify(updatedTasks));
        }
        
        // 显示成功提示，使用接口返回的消息或默认消息
        // Toast.show({ content: successMsg, icon: 'success', position: 'center' });
        
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
          router.push('/videolearn');
        }
        break;
      case 'WECHAT':
      case 'TWITTER':
        // 关注 Twitter 官方账号
        window.open('https://x.com/moziinnovation', '_blank');
        break;
      case 'COMMUNITY':
        window.open('https://t.me/MoziInnovations', '_blank');
        break;
      case 'EARLY_BIRD':
        // 早鸟活动：检查是否注册，已登录则自动完成
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
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
        break;
    }

    // 只有 TWITTER、COMMUNITY 需要中间验证状态
    const needsVerifyTasks = ['TWITTER', 'COMMUNITY'];
    if (needsVerifyTasks.includes(task.taskCode)) {
      const updatedTasks = tasksList.map(t => 
        t.id === task.id 
          ? { ...t, needsAction: false }
          : t
      );
      setTasksList(updatedTasks);
    }
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
        onBack={() => safeBack(router, { fallback: '/me' })}
      />
      
      {/* 页面标题 */}
      <div className={styles.pageTitle}>
        {t('pointsDetail.myPoints') || '我的积分'}
      </div>

      {/* 赛季卡片 */}
      <SeasonCard pointsData={pointsData} />

      {/* 本月积分池状态 */}
      <PoolStatusCard 
        poolStatus={poolStatus} 
        countdown={countdown} 
        weekendRemainingHours={weekendRemainingHours} 
      />

      {/* 邀请有奖 */}
      <InviteCard pointsData={pointsData} copyToClipboard={copyToClipboard} />

      {/* 新手任务 */}
      <NewbieTasks
        tasksList={tasksList}
        handleTaskClick={handleTaskClick}
        loading={tasksLoading}
        verifyingTaskId={verifyingTaskId}
      />

      <div>
        <InviteBanner style={{ width: '100%', height: 'auto' }} />
      </div>

      {/* 每日任务 */}
      <DailyTasks dailyInvestments={dailyInvestments} loading={dailyTasksLoading} />

      {/* 底部功能按钮 */}
      <ActionButtons />
      
    </div>
  );
}
