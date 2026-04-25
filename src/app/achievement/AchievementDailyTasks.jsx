'use client';

import { useTranslation } from 'react-i18next';
import styles from './AchievementDailyTasks.module.less';

export default function AchievementDailyTasks({ tasks }) {
  const { t } = useTranslation();
  const defaultTasks = [
    {
      id: 'daily_login',
      title: t('pointsDetail.tasks.dailyLogin.title', { defaultValue: '每日登录' }),
      reward: 50,
      current: 1,
      target: 47,
      icon: '/point/daily_login.svg',
    },
    {
      id: 'daily_like',
      title: t('pointsDetail.tasks.dailyLike.title', { defaultValue: '每日点赞' }),
      reward: 50,
      current: 1,
      target: 47,
      icon: '/point/like.svg',
    },
    {
      id: 'post',
      title: t('pointsDetail.tasks.post.title', { defaultValue: '发布帖子' }),
      reward: 50,
      current: 1,
      target: 47,
      icon: '/point/push_article.svg',
    },
    {
      id: 'reply',
      title: t('pointsDetail.tasks.reply.title', { defaultValue: '回复帖子' }),
      reward: 50,
      current: 3,
      target: 47,
      icon: '/point/reply.svg',
    },
    {
      id: 'reply_received',
      title: t('pointsDetail.tasks.postReceiveReply.title', { defaultValue: '帖子收到回复' }),
      reward: 50,
      current: 8,
      target: 47,
      icon: '/point/received.svg',
    },
    {
      id: 'share',
      title: t('pointsDetail.tasks.share.title', { defaultValue: '每日分享' }),
      reward: 50,
      current: 1,
      target: 47,
      icon: '/point/shared.svg',
    },
    {
      id: 'receive_like',
      title: t('pointsDetail.tasks.receiveLike.title', { defaultValue: '获得点赞' }),
      reward: 50,
      current: 1,
      target: 47,
      icon: '/point/received_like.svg',
    },
  ];
  const renderTasks = tasks || defaultTasks;

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <img src="/point/task_daily.svg" alt="daily task" className={styles.headerIcon} />
        <h3 className={styles.title}>
          {t('pointsDetail.dailyTasks', { defaultValue: 'Daily Quest Reward' })}
        </h3>
      </div>

      <div className={styles.list}>
        {renderTasks.map((task) => {
          const progress = Math.max(0, Math.min(100, (task.current / task.target) * 100));
          return (
            <div key={task.id} className={styles.row}>
              <div className={styles.iconWrap}>
                <img src={task.icon} alt={task.title} className={styles.taskIcon} />
              </div>

              <div className={styles.taskInfo}>
                <div className={styles.taskTitle}>{task.title}</div>
                <div className={styles.taskMetaRow}>
                  <div className={styles.taskReward}>+{task.reward}</div>
                  <div className={styles.progressArea}>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${progress}%` }}>
                        <span className={styles.progressDot}>{task.current}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.counter}>
                {task.current}/{task.target}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

