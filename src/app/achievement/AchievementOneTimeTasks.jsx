'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AchievementOneTimeTasks.module.less';

export default function AchievementOneTimeTasks({ tasks }) {
  const { t } = useTranslation();
  const defaultTasks = useMemo(
    () => [
      {
        id: 'login',
        title: t('pointsDetail.tasks.firstRegister.title', { defaultValue: '首次登录' }),
        points: 50,
        action: t('pointsDetail.completed', { defaultValue: '已完成' }),
        btnType: 'firstLoginCompleted',
        completed: true,
        icon: '/point/first_login.svg',
      },
      {
        id: 'profile',
        title: t('pointsDetail.tasks.userInfo.title', { defaultValue: '完善个人信息' }),
        points: 50,
        action: t('pointsDetail.completed', { defaultValue: '已完成' }),
        btnType: 'profile',
        completed: true,
        icon: '/point/user_info.svg',
      },
      {
        id: 'post',
        title: t('pointsDetail.tasks.push.title', { defaultValue: '发布首篇帖子' }),
        points: 50,
        action: t('pointsDetail.tasks.push.button', { defaultValue: '发布' }),
        btnType: 'post',
        icon: '/point/push.svg',
      },
      {
        id: 'watchlist',
        title: t('pointsDetail.tasks.add.title', { defaultValue: '添加自选' }),
        points: 50,
        action: t('pointsDetail.tasks.add.button', { defaultValue: '添加' }),
        btnType: 'add',
        icon: '/point/add.svg',
      },
      {
        id: 'alarm',
        title: t('pointsDetail.tasks.setAlarm.title', { defaultValue: '设置报警' }),
        points: 50,
        action: t('pointsDetail.tasks.setAlarm.button', { defaultValue: '设置' }),
        btnType: 'setup',
        icon: '/point/setting_alert.svg',
      },
      {
        id: 'telegram',
        title: t('pointsDetail.tasks.joinCommunity.title', { defaultValue: '加入社群' }),
        points: 50,
        action: t('pointsDetail.tasks.joinCommunity.button', { defaultValue: '加入' }),
        btnType: 'join',
        icon: '/point/group.svg',
      },
      {
        id: 'earlybird',
        title: t('pointsDetail.tasks.earlyBird.title', { defaultValue: '早鸟奖励' }),
        points: 50,
        action: t('pointsDetail.tasks.earlyBird.button', { defaultValue: '登录' }),
        btnType: 'login',
        icon: '/point/eraly_bird.svg',
      },
      {
        id: 'x',
        title: t('pointsDetail.tasks.followTwitter.title', { defaultValue: '关注 X' }),
        points: 50,
        action: t('pointsDetail.tasks.followTwitter.button', { defaultValue: '关注' }),
        btnType: 'follow',
        icon: '/point/X.svg',
      },
    ],
    [t]
  );
  const renderTasks = tasks || defaultTasks;

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <img src="/point/new_alert.svg" alt="starter reward" className={styles.starIcon} />
        <h3 className={styles.title}>
          {t('pointsDetail.newbieTasks', { defaultValue: 'Starter Quest Reward' })}
        </h3>
      </div>

      <div className={styles.list}>
        {renderTasks.map((task) => (
          <div key={task.id} className={styles.row}>
            <div className={styles.left}>
              <div className={styles.iconWrap}>
                <img src={task.icon} alt={task.title} className={styles.taskIcon} />
              </div>
              <div className={styles.info}>
                <div className={styles.taskTitle}>{task.title}</div>
                <div className={styles.reward}>+{task.points}</div>
              </div>
            </div>
            <div className={styles.right}>
              <span className={styles.pointPill}>+{task.points}</span>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles[`btn_${task.btnType || 'post'}`]} ${task.completed ? styles.completed : ''}`}
                >
                  {task.action}
                </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

