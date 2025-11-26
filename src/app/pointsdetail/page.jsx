'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, Tabs } from 'antd-mobile';
import { ClockCircleOutline, LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import styles from './page.module.less';

export default function PointsDetail() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const [activeTab, setActiveTab] = useState('myPoints');
  
  const pointsData = {
    totalPoints: 45123,
    season: t('pointsDetail.seasonName'),
    seasonStart: '2025-09-25',
    seasonEnd: '2025-10-25',
    inviteLink: 'y79lll/e]suow\'eloos\'s//:sd14',
    inviteCode: '30L234',
    totalInvites: 50,
    earnedPoints: 21323,
    activeInvites: 50,
    pendingRewards: 0
  };

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

  // 页面加载时恢复任务状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTasks = localStorage.getItem('pointsTasks');
      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          setTasksList(tasks);
        } catch (e) {
          console.error('Failed to restore task state:', e);
        }
      }
    }
  }, []);

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

  // 验证任务完成
  const verifyTask = async (task) => {
    try {
      setVerifyingTaskId(task.id);
      let isCompleted = false;
      
      // 根据不同任务进行验证
      if (task.titleKey === 'pointsDetail.tasks.firstRegister.title' || task.titleKey === 'pointsDetail.tasks.earlyBird.title' || task.titleKey === 'pointsDetail.tasks.setAlarm.title') {
        // 检查用户是否已登录（检查 localStorage 中的 token）
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          isCompleted = true;
        }
      } else if (task.titleKey === 'pointsDetail.tasks.videoLearn.title') {
        // 检查本地存储的视频完成状态
        try {
          const saved = typeof window !== 'undefined' ? localStorage.getItem('completedVideos') : null;
          const total = typeof window !== 'undefined' ? localStorage.getItem('videoLearnTotal') : '0';
          if (saved) {
            const map = JSON.parse(saved);
            const finished = Object.values(map).filter(Boolean).length;
            const totalNum = parseInt(total) || 0;
            if (totalNum > 0 && finished >= totalNum) {
              isCompleted = true;
            }
          }
        } catch (e) {
          console.error('Failed to verify video learning completion status', e);
        }
      }
      
      if (isCompleted) {
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
        
        Toast.show({ content: t('pointsDetail.messages.pointsEarned', { points: task.points }), icon: 'success', position: 'center' });
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
        
        Toast.show({ content: t('pointsDetail.messages.taskNotCompleted'), position: 'center' });
      }
    } catch (error) {
      console.error('Failed to verify task:', error);
      
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
                      <div className={styles.taskTitle}>{t(task.titleKey)}</div>
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

