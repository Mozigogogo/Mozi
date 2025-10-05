'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, Tabs } from 'antd-mobile';
import { ClockCircleOutline, LeftOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import styles from './page.module.less';

export default function PointsDetail() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('myPoints');
  
  const pointsData = {
    totalPoints: 45123,
    season: 'S5赛季',
    seasonStart: '2025-09-25',
    seasonEnd: '2025-10-25',
    inviteLink: 'y79lll/e]suow\'eloos\'s//:sd14',
    inviteCode: '30L234',
    totalInvites: 50,
    earnedPoints: 21323,
    activeInvites: 50,
    pendingRewards: 0
  };

  const tasks = [
    { id: 1, icon: '/point/contact_person@2x.png', title: '首次注册账号', points: 50, status: 'pending', btnText: '去注册' },
    { id: 2, icon: '/point/like@2x.png', title: '关注我们的公众号', points: 50, status: 'completed', btnText: '已关注' },
    { id: 3, icon: '/point/social_group@2x.png', title: '加入我们的社群', points: 50, status: 'pending', btnText: '去加入' },
    { id: 4, icon: '/point/twitter@2x.png', title: '早鸟活动', points: 200, status: 'pending', btnText: '去参加' },
    { id: 5, icon: '/point/set_alert@2x.png', title: '设置报警功能', points: 100, status: 'completed', btnText: '已设置' },
    { id: 6, icon: '/point/video@2x.png', title: '完成视频学习', points: 50, status: 'pending', btnText: '去学习' }
  ];

  const dailyInvestments = [
    { id: 1, icon: '/point/glove_praise@2x.png', title: '每日点赞', rewardLabel: '每个赞', reward: 4, current: 3, total: 47 },
    { id: 2, icon: '/point/paper_airplane@2x.png', title: '发帖', rewardLabel: '每条帖子', reward: 10, current: 10, total: 47 },
    // 注意：仓库中该文件名有前导空格，使用 URL 编码以确保能加载
    { id: 3, icon: '/point/%20no_glove_praise@2x.png', title: '收到赞', rewardLabel: '每次被赞', reward: 4, current: 7, total: 47 },
    { id: 4, icon: '/point/notification_1@2x.png', title: '回复', rewardLabel: '回复一次', reward: 4, current: 9, total: 10 },
    { id: 5, icon: '/point/notification_2@2x.png', title: '帖子收到回复', rewardLabel: '收到回复', reward: 4, current: 10, total: 10, completed: true }
  ];

  const handleTaskClick = (task) => {
    if (task.status === 'completed') {
      Toast.show({ content: '任务已完成', position: 'bottom' });
    } else {
      Toast.show({ content: `${task.btnText}功能开发中`, position: 'bottom' });
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      Toast.show({ content: `${label}已复制`, position: 'bottom' });
    }).catch(() => {
      Toast.show({ content: '复制失败', position: 'bottom', icon: 'fail' });
    });
  };

  const tabs = [
    { key: 'myPoints', title: t('pointsDetail.myPoints', '我的积分') },
    { key: 'myInvites', title: t('pointsDetail.myInvites', '我的邀请') }
  ];

  return (

      <div className={styles.pointsDetailContainer}>
        {/* 顶部导航 */}
        <div className={styles.topNav}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <LeftOutline />
          </button>
          <div className={styles.navTitle}>积分中心</div>
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
                  {pointsData.seasonStart} 至 {pointsData.seasonEnd}
                </div>
              </div>
            </div>
            <div className={styles.pointsDisplay}>
              <img src="/point/coin_icon@2x.png" alt="Coin" className={styles.coinIcon} />
              <div className={styles.pointsValue}>{pointsData.totalPoints}</div>
              <button className={styles.historyBtn} onClick={() => Toast.show(t('pointsDetail.historyFeatureInDevelopment'))}>
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
          <div className={styles.moziBanner}>
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
              <h3>{t('pointsDetail.fanRewardsTitle')}</h3>
            </div>
            
            <div className={styles.tasksList}>
              {tasks.map(task => (
                <div key={task.id} className={`${styles.taskItem} ${task.status === 'completed' ? styles.completed : ''}`}>
                  <div className={styles.taskIconWrapper}>
                    <img src={task.icon} alt={task.title} className={styles.taskIconImg} />
                  </div>
                  <div className={styles.taskInfo}>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.taskPoints}>
                      +{task.points}
                      <img src="/point/coin_icon@2x.png" alt="Coin" className={styles.taskCoinIcon} />
                    </div>
                  </div>
                  <button 
                    className={`${styles.taskBtn} ${task.status === 'completed' ? styles.completedBtn : ''}`}
                    onClick={() => handleTaskClick(task)}
                  >
                    {task.btnText}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 获得更多积分横幅 */}
          <div className={styles.earnMoreBanner}>
            
          </div>

          {/* 每日投资排行 */}
          <div className={styles.dailyInvestmentSection}>
            <div className={styles.sectionHeader}>
              <img src="/point/Emoji_3@2x.png" alt="Daily" className={styles.headerIconImg} />
              <h3>每日奖励任务</h3>
            </div>

            <div className={styles.investmentList}>
              {dailyInvestments.map(item => (
                <div key={item.id} className={styles.investmentItem}>
                  <div className={styles.investmentIcon}>
                    <img src={item.icon} alt={item.title} className={styles.investmentIconImg} />
                  </div>
                  <div className={styles.investmentInfo}>
                    <div className={styles.investmentTitle}>{item.title}</div>
                    <div className={styles.investmentSubtitle}>
                      <span>{item.rewardLabel}</span>
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
            <button className={styles.bottomBtn} onClick={() => Toast.show(t('pointsDetail.joinAlarm'))}>
              <div className={styles.bottomBtnContent}>
                <div className={styles.bottomBtnTitle}>{t('pointsDetail.joinAlarm')}</div>
                <div className={styles.bottomBtnSubtitle}>Add an alarm</div>
              </div>
              <img src="/point/point_alert@2x.png" alt="Alert" className={styles.bottomIcon} />
            </button>

            <button className={styles.bottomBtn} onClick={() => Toast.show(t('pointsDetail.certification'))}>
              <div className={styles.bottomBtnContent}>
                <div className={styles.bottomBtnTitle}>{t('pointsDetail.certification')}</div>
                <div className={styles.bottomBtnSubtitle}>certification</div>
              </div>
              <img src="/point/Certification@2x.png" alt="Certification" className={styles.bottomIcon} />
            </button>
          </div>
        </div>
      </div>
  );
}

