'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, Tabs } from 'antd-mobile';
import { ClockCircleOutline, LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './page.module.less';

export default function PointsDetail() {
  const router = useRouter();
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

  // 页面加载时获取积分数据和邀请列表
  useEffect(() => {
    fetchPointsData();
    fetchInvitationList();
  }, [fetchPointsData, fetchInvitationList]);

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

  // 获取任务列表
  const fetchTaskList = useCallback(async () => {
    try {
      setTasksLoading(true);
      const res = await request({
        url: Interface.TASK_LIST,
        method: 'GET'
      });
      
      if (res?.code === 0 && res?.data) {
        const tasks = res.data.tasks || res.data || [];
        // 将接口数据映射到组件需要的格式
        const mappedTasks = tasks.map((task, index) => {
          const taskKey = taskKeyMap[task.taskCode] || 'setAlarm';
          return {
            id: task.id || index + 1,
            taskCode: task.taskCode,
            icon: taskIconMap[task.taskCode] || '/point/set_alert@2x.png',
            // 直接使用接口返回的任务名称
            title: task.taskName,
            titleKey: `pointsDetail.tasks.${taskKey}.title`,
            btnTextKey: `pointsDetail.tasks.${taskKey}.button`,
            // 使用 rewardPoints 字段
            points: task.rewardPoints || 0,
            // 使用 isCompleted 字段判断状态
            status: task.isCompleted ? 'completed' : 'pending',
            needsAction: !task.isCompleted
          };
        });
        
        if (mappedTasks.length > 0) {
          setTasksList(mappedTasks);
        }
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
      // 接口失败时保留默认任务列表
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // 页面加载时获取任务列表
  useEffect(() => {
    fetchTaskList();
  }, [fetchTaskList]);

  const dailyInvestments = [
    {
      id: 1,
      icon: '/point/glove_praise@2x.png',
      titleKey: 'pointsDetail.dailyTasks.like.title',
      rewardLabelKey: 'pointsDetail.dailyTasks.like.label',
      reward: 4,
      current: 3,
      total: 47,
    },
    {
      id: 2,
      icon: '/point/paper_airplane@2x.png',
      titleKey: 'pointsDetail.dailyTasks.post.title',
      rewardLabelKey: 'pointsDetail.dailyTasks.post.label',
      reward: 10,
      current: 10,
      total: 47,
    },
    // 注意：仓库中该文件名有前导空格，使用 URL 编码以确保能加载
    {
      id: 3,
      icon: '/point/%20no_glove_praise@2x.png',
      titleKey: 'pointsDetail.dailyTasks.receivedLike.title',
      rewardLabelKey: 'pointsDetail.dailyTasks.receivedLike.label',
      reward: 4,
      current: 7,
      total: 47,
    },
    {
      id: 4,
      icon: '/point/notification_1@2x.png',
      titleKey: 'pointsDetail.dailyTasks.reply.title',
      rewardLabelKey: 'pointsDetail.dailyTasks.reply.label',
      reward: 4,
      current: 9,
      total: 10,
    },
    {
      id: 5,
      icon: '/point/notification_2@2x.png',
      titleKey: 'pointsDetail.dailyTasks.postReplied.title',
      rewardLabelKey: 'pointsDetail.dailyTasks.postReplied.label',
      reward: 4,
      current: 10,
      total: 10,
      completed: true,
    },
  ];

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
      
      // 调用后端接口完成任务
      const res = await request({
        url: Interface.TASK_COMPLETE,
        method: 'POST',
        data: {
          taskCode: task.taskCode || task.id
        }
      });
      
      console.log('任务完成接口返回:', res);
      
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

    // 如果需要先去完成任务（needsAction为true）
    if (task.needsAction) {
      // 立即标记为待验证状态
      const updatedTasks = tasksList.map(t => 
        t.id === task.id 
          ? { ...t, needsAction: false }
          : t
      );
      setTasksList(updatedTasks);
      
      // 保存到本地存储
      if (typeof window !== 'undefined') {
        localStorage.setItem('pointsTasks', JSON.stringify(updatedTasks));
      }
      
      // 跳转到对应页面
      if (task.titleKey === 'pointsDetail.tasks.firstRegister.title') {
        router.push('/user?mode=register');
        return;
      }

      if (task.titleKey === 'pointsDetail.tasks.earlyBird.title') {
        // 早鸟活动：检查是否注册
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          Toast.show({ content: t('pointsDetail.pleaseRegister'), position: 'bottom' });
          router.push('/user?mode=register');
          return;
        }
        // 已注册，按钮已变为"验证"，不需要额外操作
        return;
      }

      if (task.titleKey === 'pointsDetail.tasks.videoLearn.title') {
        router.push('/videolearn');
        return;
      }

      if (task.titleKey === 'pointsDetail.tasks.followTwitter.title') {
        // 跳转到 X (Twitter) 账号
        window.open('https://x.com/Innovation56171', '_blank');
        return;
      }

      if (task.titleKey === 'pointsDetail.tasks.joinCommunity.title') {
        // 跳转到 Telegram 社群链接
        window.open('https://t.me/MoziInnovations', '_blank');
        return;
      }

      if (task.titleKey === 'pointsDetail.tasks.setAlarm.title') {
        router.push('/addwarn?symbol=BTC');
        return;
      }

      Toast.show({ content: t('pointsDetail.historyFeatureInDevelopment'), position: 'bottom' });
    } else {
      // 如果是验证状态（needsAction为false），点击进行验证
      verifyTask(task);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      Toast.show({ content: t('pointsDetail.linkCopied'), position: 'bottom' });
    }).catch(() => {
      Toast.show({ content: t('pointsDetail.copyFailed'), position: 'bottom', icon: 'fail' });
    });
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
                <span className={styles.inviteInputText}>{pointsData.inviteLink}</span>
                <button 
                  onClick={() => copyToClipboard(pointsData.inviteLink, t('pointsDetail.inviteLink'))} 
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
              <div className={styles.statCard}>
                <div className={styles.statValue}>{pointsData.activeInvites}</div>
                <div className={styles.statLabel}>{t('pointsDetail.activeInvites')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  {pointsData.pendingRewards === 0 ? <img src="/point/info@2x.png" alt="Info" className={styles.infoIcon} /> : pointsData.pendingRewards}
                </div>
                <div className={styles.statLabel}>{t('pointsDetail.pendingRewards')}</div>
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
              <h3>{t('pointsDetail.dailyRewardTasksTitle')}</h3>
            </div>

            <div className={styles.investmentList}>
              {dailyInvestments.map(item => (
                <div key={item.id} className={styles.investmentItem}>
                  <div className={styles.investmentIcon}>
                    <img src={item.icon} alt={item.title} className={styles.investmentIconImg} />
                  </div>
                  <div className={styles.investmentInfo}>
                    <div className={styles.investmentTitle}>{t(item.titleKey)}</div>
                    <div className={styles.investmentSubtitle}>
                      <span>{t(item.rewardLabelKey)}</span>
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
                  {/* moved into progressRow for inline layout */}
                </div>
              ))}
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

