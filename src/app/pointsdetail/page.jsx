'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, Tabs } from 'antd-mobile';
import { ClockCircleOutline } from 'antd-mobile-icons';
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
    { id: 1, icon: '🎯', title: '首次注册赠号', points: 30, status: 'pending', btnText: '去注册' },
    { id: 2, icon: '✅', title: '完成邀件2次交易', points: 5, status: 'completed', btnText: '已完成' },
    { id: 3, icon: '👥', title: '加入他们的社群', points: 20, status: 'pending', btnText: '去加入' },
    { id: 4, icon: '🌅', title: '早晨登录', points: 200, status: 'pending', btnText: '去登录' },
    { id: 5, icon: '⭐', title: '收藏我的推文', points: 100, status: 'completed', btnText: '已收藏' },
    { id: 6, icon: '📚', title: '类似链接学习', points: 5, status: 'pending', btnText: '去学习' }
  ];

  const dailyInvestments = [
    { id: 1, title: '每日点赞', subtitle: '每天点赞+30🪙', current: 3, total: 47 },
    { id: 2, title: '签到', subtitle: '每周签到+20🪙', current: 10, total: 47 },
    { id: 3, title: '收到糖', subtitle: '收到糖+7🪙', current: 7, total: 47 },
    { id: 4, title: '阅读', subtitle: '阅读一遍+9🪙', current: 9, total: 0 },
    { id: 5, title: '获字寺币排除', subtitle: '获字寺+20🪙', current: 47, total: 47, completed: true }
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
    <Layout>
      <div className={styles.pointsDetailContainer}>
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
              <span className={styles.taskIcon}>😍</span>
              <h3>{t('pointsDetail.fanRewardsTitle')}</h3>
            </div>
            
            <div className={styles.tasksList}>
              {tasks.map(task => (
                <div key={task.id} className={`${styles.taskItem} ${task.status === 'completed' ? styles.completed : ''}`}>
                  <div className={styles.taskIcon}>{task.icon}</div>
                  <div className={styles.taskInfo}>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.taskPoints}>+{task.points}🪙</div>
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
            <span className={styles.bannerText}>{t('pointsDetail.earnMorePoints')}</span>
            <img 
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/mozi-mascot.png" 
              alt="Mascot" 
              className={styles.bannerMascot}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* 每日投资排行 */}
          <div className={styles.dailyInvestmentSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.headerIcon}>🎁</span>
              <h3>{t('pointsDetail.dailyInvestmentTitle')}</h3>
            </div>

            <div className={styles.investmentList}>
              {dailyInvestments.map(item => (
                <div key={item.id} className={styles.investmentItem}>
                  <div className={styles.investmentIcon}>📦</div>
                  <div className={styles.investmentInfo}>
                    <div className={styles.investmentTitle}>{item.title}</div>
                    <div className={styles.investmentSubtitle}>{item.subtitle}</div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${item.total > 0 ? (item.current / item.total * 100) : 100}%` }}
                      />
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
              ))}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className={styles.bottomButtons}>
            <button className={styles.bottomBtn} onClick={() => Toast.show(t('pointsDetail.joinAlarm'))}>
              <span>🔔</span>
              {t('pointsDetail.joinAlarm')}
            </button>
            <button className={styles.bottomBtn} onClick={() => Toast.show(t('pointsDetail.certification'))}>
              <span>🛡️</span>
              {t('pointsDetail.certification')}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

