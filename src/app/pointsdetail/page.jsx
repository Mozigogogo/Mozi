'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, Tabs } from 'antd-mobile';
import { ClockCircleOutline, LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { request } from '../../utils/request';
import { Interface, getTgInviteLink } from '../../utils/constants';
import styles from './page.module.less';

export default function PointsDetail() {
  const router = useRouter();
  
  // 防止重复调用的标记
  const isDataFetchedRef = useRef(false);
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const [activeTab, setActiveTab] = useState('myPoints');
  const [pointsLoading, setPointsLoading] = useState(false);
  
  // 积分数据 state，初始使用默认值
  const [pointsData, setPointsData] = useState({
    totalPoints: 0,
    season: t('pointsDetail.seasonName'),
    seasonStart: '2025-09-25',
    seasonEnd: '2025-10-25',
    inviteLink: '',
    inviteCode: '',
    totalInvites: 0,
    earnedPoints: 0,
    activeInvites: 0,
    pendingRewards: 0
  });

  // 获取用户积分数据
  const fetchPointsData = useCallback(async () => {
    try {
      setPointsLoading(true);
      const res = await request({
        url: Interface.TASK_POINTS,
        method: 'GET'
      });
      
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

  // 获取用户数据（含邀请码）
  const fetchUserDataInfo = useCallback(async () => {
    try {
      const res = await request({
        url: Interface.USER_DATA_INFO,
        method: 'GET'
      });
      
      console.log('🔍 [DEBUG] 用户数据接口返回:', res);
      
      if (res?.code === 0 && res?.data) {
        const data = res.data;
        setPointsData(prev => ({
          ...prev,
          inviteCode: data.inviteCode || data.invitationCode || prev.inviteCode,
        }));
      }
    } catch (error) {
      console.error('获取用户数据失败:', error);
    }
  }, []);

  // 获取邀请列表数据
  const fetchInvitationList = useCallback(async () => {
    try {
      const res = await request({
        url: Interface.TASK_INVITATION_LIST,
        method: 'GET'
      });
      
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
          earnedPoints: data.earnedPoints ?? prev.earnedPoints,
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
  }, []);

  // 使用函数延迟初始化任务列表，确保 t() 在组件渲染时可用
  const getInitialTasks = () => [
    { id: 1, icon: '/point/contact_person@2x.png', titleKey: 'pointsDetail.tasks.firstRegister.title', btnTextKey: 'pointsDetail.tasks.firstRegister.button', points: 50, status: 'pending', needsAction: true },
    { id: 2, icon: '/point/like@2x.png', titleKey: 'pointsDetail.tasks.followTwitter.title', btnTextKey: 'pointsDetail.tasks.followTwitter.button', points: 50, status: 'pending', needsAction: true },
    { id: 3, icon: '/point/social_group@2x.png', titleKey: 'pointsDetail.tasks.joinCommunity.title', btnTextKey: 'pointsDetail.tasks.joinCommunity.button', points: 50, status: 'pending', needsAction: true },
    { id: 4, icon: '/point/twitter@2x.png', titleKey: 'pointsDetail.tasks.earlyBird.title', btnTextKey: 'pointsDetail.tasks.earlyBird.button', points: 200, status: 'pending', needsAction: true },
    { id: 5, icon: '/point/set_alert@2x.png', titleKey: 'pointsDetail.tasks.setAlarm.title', btnTextKey: 'pointsDetail.tasks.setAlarm.button', points: 100, status: 'pending', needsAction: true },
    { id: 6, icon: '/point/video@2x.png', titleKey: 'pointsDetail.tasks.videoLearn.title', btnTextKey: 'pointsDetail.tasks.videoLearn.button', points: 50, status: 'pending', needsAction: true }
  ];
  
  const [tasksList, setTasksList] = useState(getInitialTasks());
  const [verifyingTaskId, setVerifyingTaskId] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // 每日任务列表 state
  const [dailyInvestments, setDailyInvestments] = useState([]);
  const [dailyTasksLoading, setDailyTasksLoading] = useState(false);

  // 任务类型到图标的映射
  const taskIconMap = {
    'REGISTER': '/point/contact_person@2x.png',
    'FOLLOW_TWITTER': '/point/like@2x.png',
    'JOIN_COMMUNITY': '/point/social_group@2x.png',
    'COMMUNITY': '/point/social_group@2x.png',
    'EARLY_BIRD': '/point/twitter@2x.png',
    'SET_ALARM': '/point/set_alert@2x.png',
    'ALARM': '/point/set_alert@2x.png',
    'VIDEO_LEARN': '/point/video@2x.png',
    'VIDEO': '/point/video@2x.png',
    'WECHAT': '/point/like@2x.png',
    'DAILY_LOGIN': '/point/contact_person@2x.png',
    'INVITE_USER': '/point/invite@2x.png',
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
  };

  // 获取任务列表（活动任务 + 每日任务，合并为一次接口调用）
  const fetchAllTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setDailyTasksLoading(true);
      const res = await request({
        url: Interface.TASK_LIST,
        method: 'GET'
      });
      
      console.log('🔍 [DEBUG] TASK_LIST 接口返回:', res);
      
      if (res?.code === 0 && res?.data) {
        // 处理活动任务 activityTaskList
        const activityTasks = res.data.activityTaskList || [];
        const mappedTasks = activityTasks
          .filter(task => task.taskCode !== 'WECHAT' && task.taskCode !== 'INVITE_USER')
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((task, index) => {
            const taskKey = taskKeyMap[task.taskCode] || 'setAlarm';
            return {
              id: task.id || index + 1,
              taskCode: task.taskCode,
              icon: taskIconMap[task.taskCode] || '/point/set_alert@2x.png',
              title: task.taskName,
              titleKey: `pointsDetail.tasks.${taskKey}.title`,
              btnTextKey: `pointsDetail.tasks.${taskKey}.button`,
              points: task.rewardPoints || 0,
              status: task.isCompleted ? 'completed' : 'pending',
              needsAction: !task.isCompleted
            };
          });
        
        if (mappedTasks.length > 0) {
          setTasksList(mappedTasks);
        }

        // 处理每日任务 dailyTaskList
        const dailyTasks = res.data.dailyTaskList || [];
        if (dailyTasks.length > 0) {
          const mappedDailyTasks = dailyTasks
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((task, index) => ({
              id: task.taskCode || index + 1,
              icon: dailyTaskIconMap[task.taskCode] || '/point/glove_praise@2x.png',
              title: task.taskName,
              rewardLabel: task.taskDesc,
              reward: task.rewardPoints || 0,
              current: task.currentProgress || 0,
              total: task.targetProgress || 1,
              completed: task.isCompleted || false,
            }));
          setDailyInvestments(mappedDailyTasks);
        }
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
          const res = await request({
            url: Interface.TASK_COMPLETE,
            method: 'POST',
            data: { taskCode: 'EARLY_BIRD' }
          });
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

  // 每日任务图标映射
  const dailyTaskIconMap = {
    'DAILY_LIKE': '/point/glove_praise@2x.png',
    'POST': '/point/paper_airplane@2x.png',
    'RECEIVE_LIKE': '/point/%20no_glove_praise@2x.png',
    'REPLY': '/point/notification_1@2x.png',
    'POST_RECEIVE_REPLY': '/point/notification_2@2x.png',
    'DAILY_LOGIN': '/point/contact_person@2x.png',
  };

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
      const res = await request({
        url: Interface.TASK_COMPLETE,
        method: 'POST',
        data: {
          taskCode: task.taskCode
        }
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

  const tabs = [
    { key: 'myPoints', title: t('pointsDetail.myPoints') }
  ];

  return (

      <div className={styles.pointsDetailContainer}>
        {/* 顶部导航 */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <LeftOutline />
          </button>
          <div className={styles.navTitle}>{t('pointsDetail.centerTitle')}</div>
        </div>
        {/* 顶部Tab */}
        <div className={styles.tabsContainer}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className={styles.tabs}
          >
            {tabs.map(tab => (
              <Tabs.Tab title={tab.title} key={tab.key} />
            ))}
          </Tabs>
        </div>

        <div className={styles.topSection}>
          {/* 积分卡片 */}
          <div className={styles.pointsCard}>
            <div className={styles.seasonBackgroundCard}>
              <div className={styles.cardHeader}>
                <img src="/point/moz_logo@2x.png" alt="Logo" className={styles.logo} />
              </div>
              <div className={styles.seasonInfo}>
                <h2 className={styles.seasonTitle}>{pointsData.season}</h2>
                <div className={styles.seasonDuration}>
                  <ClockCircleOutline className={styles.clockIcon} />
                  {pointsData.seasonStart} {t('pointsDetail.toSeparator')} {pointsData.seasonEnd}
                </div>
              </div>
            </div>
            <div className={styles.pointsDisplay}>
              <img src="/point/coin_icon@2x.png" alt="Coin" className={styles.coinIcon} />
              <div className={styles.pointsValue}>{pointsData.totalPoints}</div>
              <button className={styles.historyBtn} onClick={() => router.push('/pointshistory')}>
                <ClockCircleOutline className={styles.historyIcon} />
                {t('pointsDetail.historyRecord')}
              </button>
            </div>
            <img 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/points-character.png" 
              alt="Character" 
              className={styles.characterImg}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* MOZI横幅 */}
          <div 
            className={styles.moziBanner}
            style={{ 
              backgroundImage: `url('${isEnglish ? '/point/piont_banner1.png' : '/point/define_bg@2x.png'}')` 
            }}
          >
            {/* 背景图片自带文字，无需额外内容 */}
          </div>
        </div>

        <div className={styles.bottomSection}>
          {/* 邀请推荐区域 */}
          <div className={styles.inviteSection}>
            {/* 标题区域 */}
            <div className={styles.inviteHeader}>
              <img src="/point/Emoji_1@2x.png" alt="Emoji" className={styles.emojiIcon} />
              <div className={styles.inviteTitle}>{t('pointsDetail.inviteRewardTitle')}</div>
            </div>

            {/* 邀请有奖卡片 */}
            <div className={styles.rewardCard}>
              <img src="/point/invite@2x.png" alt="Invite" className={styles.rewardIcon} />
              <div className={styles.rewardInfo}>
                <h4>{t('pointsDetail.inviteReward')}</h4>
                <p>
                  {t('pointsDetail.perInvite')} 
                  <span className={styles.bonusPoints}>
                    +500<img src="/point/coin_icon@2x.png" alt="Coin" className={styles.bonusCoinIcon} />
                  </span>
                </p>
              </div>
            </div>

            {/* 邀请链接 */}
            <div className={styles.inviteInputBox}>
              <div className={styles.inviteInputLabel}>{t('pointsDetail.inviteLink')}</div>
              <div className={styles.inviteInputContent}>
                <span className={styles.inviteInputText}>{getTgInviteLink(pointsData.inviteCode)}</span>
                <button 
                  onClick={() => copyToClipboard(getTgInviteLink(pointsData.inviteCode), t('pointsDetail.inviteLink'))} 
                  className={styles.copyIconBtn}>
                  <img src="/point/copy@2x.png" alt="Copy" className={styles.copyIcon} />
                </button>
              </div>
            </div>

            {/* 邀请码 */}
            <div className={styles.inviteInputBox}>
              <div className={styles.inviteInputLabel}>{t('pointsDetail.inviteCode')}</div>
              <div className={styles.inviteInputContent}>
                <span className={styles.inviteInputText}>{pointsData.inviteCode}</span>
                <button 
                  onClick={() => copyToClipboard(pointsData.inviteCode, t('pointsDetail.inviteCode'))} 
                  className={styles.copyIconBtn}>
                  <img src="/point/copy@2x.png" alt="Copy" className={styles.copyIcon} />
                </button>
              </div>
            </div>

            {/* 统计数据网格 */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{pointsData.totalInvites}</div>
                <div className={styles.statLabel}>{t('pointsDetail.totalInvites')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{pointsData.earnedPoints}</div>
                <div className={styles.statLabel}>{t('pointsDetail.earnedPoints')}</div>
              </div>
            </div>

            {/* 说明文字 */}
            <div className={styles.inviteNotes}>
              <p>1. {t('pointsDetail.note1')}</p>
              <p>2. {t('pointsDetail.note2')}</p>
              <p>3. {t('pointsDetail.note3')}</p>
            </div>
          </div>

          {/* 疯狂爱好者积分奖励 */}
          <div className={styles.tasksSection}>
            <div className={styles.tasksSectionHeader}>
              <img src="/point/Emoji_2@2x.png" alt="Praise" className={styles.headerIconImg} />
              <h3>{t('pointsDetail.dailyRewardTasksTitle')}</h3>
            </div>
            
            <div className={styles.tasksList}>
              {tasksList.map(task => {
                // 判断按钮状态
                const isVerifying = verifyingTaskId === task.id;
                const isCompleted = task.status === 'completed';
                const isWaitingVerify = !task.needsAction && task.status === 'pending'; // 待验证状态
                
                // 按钮文本
                let btnText;
                if (isCompleted) {
                  btnText = t('pointsDetail.tasks.completed');
                } else if (isVerifying) {
                  btnText = t('pointsDetail.verifying');
                } else if (isWaitingVerify) {
                  btnText = t('pointsDetail.tasks.verify');
                } else {
                  btnText = t(task.btnTextKey);
                }
                
                // 按钮样式
                let btnClassName = styles.taskBtn;
                if (isCompleted) btnClassName += ` ${styles.completedBtn}`;
                else if (isVerifying) btnClassName += ` ${styles.verifyingBtn}`;
                else if (isWaitingVerify) btnClassName += ` ${styles.verifyBtn}`;
                
                return (
                  <div key={task.id} className={`${styles.taskItem} ${isCompleted ? styles.completed : ''}`}>
                    <div className={styles.taskIconWrapper}>
                      <img src={task.icon} alt={t(task.titleKey)} className={styles.taskIconImg} />
                    </div>
                    <div className={styles.taskInfo}>
                      <div className={styles.taskTitle}>{task.title || t(task.titleKey)}</div>
                      <div className={styles.taskPoints}>
                        +{task.points}
                        <img src="/point/coin_icon@2x.png" alt="Coin" className={styles.taskCoinIcon} />
                      </div>
                    </div>
                    <button 
                      className={btnClassName}
                      onClick={() => handleTaskClick(task)}
                      disabled={isVerifying}
                    >
                      {btnText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 获得更多积分横幅 */}
          <div 
            className={styles.earnMoreBanner}
            style={{ 
              backgroundImage: `url('${isEnglish ? '/point/point_banner2.png' : '/point/last_bg@2x.png'}')` 
            }}
          >
            
          </div>

          {/* 每日奖励任务 */}
          <div className={styles.dailyInvestmentSection}>
            <div className={styles.sectionHeader}>
              <img src="/point/Emoji_3@2x.png" alt="Daily" className={styles.headerIconImg} />
              <h3>{t('pointsDetail.fanRewardsTitle')}</h3>
            </div>

            <div className={styles.investmentList}>
              {dailyTasksLoading ? (
                <div className={styles.loading}>{t('common.loading')}</div>
              ) : dailyInvestments.length === 0 ? (
                <div className={styles.emptyTip}>{t('common.noData')}</div>
              ) : (
                dailyInvestments.map(item => (
                  <div key={item.id} className={styles.investmentItem}>
                    <div className={styles.investmentIcon}>
                      <img src={item.icon} alt={item.title} className={styles.investmentIconImg} />
                    </div>
                    <div className={styles.investmentInfo}>
                      <div className={styles.investmentTitle}>{item.title}</div>
                      <div className={styles.investmentSubtitle}>
                        <span>{item.rewardLabel?.replace(/\+?\d+/g, '').trim()}</span>
                        <span className={styles.rewardValue}>+{item.reward}</span>
                        <img src="/point/coin_icon@2x.png" alt="coin" className={styles.investmentCoinIcon} />
                      </div>
                      <div className={styles.progressRow}>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${item.total > 0 ? (item.current / item.total * 100) : 100}%` }}
                          />
                          <div
                            className={styles.progressHandle}
                            style={{ left: `${item.total > 0 ? (item.current / item.total * 100) : 100}%` }}
                          >
                            <span>{item.current}</span>
                          </div>
                        </div>
                        <div className={styles.investmentProgress}>
                          {item.completed ? (
                            <span className={styles.completedLabel}>{t('pointsDetail.completed')}</span>
                          ) : (
                            <span>{item.current}/{item.total}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className={styles.bottomButtons}>
            <button className={styles.bottomBtn} onClick={() => router.push('/addwarn?symbol=BTC')}>
              <div className={styles.bottomBtnContent}>
                <div className={styles.bottomBtnTitle}>{t('pointsDetail.joinAlarm')}</div>
                <div className={styles.bottomBtnSubtitle}>{t('pointsDetail.joinAlarmSubtitle')}</div>
              </div>
              <img src="/point/point_alert@2x.png" alt="Alert" className={styles.bottomIcon} />
            </button>

            <button className={styles.bottomBtn} onClick={() => router.push('/kyc')}>
              <div className={styles.bottomBtnContent}>
                <div className={styles.bottomBtnTitle}>{t('pointsDetail.certification')}</div>
                <div className={styles.bottomBtnSubtitle}>{t('pointsDetail.certificationSubtitle')}</div>
              </div>
              <img src="/point/Certification@2x.png" alt="Certification" className={styles.bottomIcon} />
            </button>
          </div>
        </div>
      </div>
  );
}

