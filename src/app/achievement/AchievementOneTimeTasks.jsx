'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading } from '@/components/Loading';
import styles from './AchievementOneTimeTasks.module.less';

export default function AchievementOneTimeTasks({ tasks, onTaskClick, verifyingTaskId = null, loading = false }) {
  const { t } = useTranslation();
  const renderTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/new_alert.svg" alt="starter reward" className={styles.starIcon} />
        <h3 className={styles.title}>
          {t('pointsDetail.newbieTasks', { defaultValue: 'Starter Quest Reward' })}
        </h3>
      </div>

      {loading ? (
        <div className={styles.stateBox}>
          <Loading color="#11B787" size={20} />
        </div>
      ) : renderTasks.length === 0 ? (
        <div className={styles.stateBox}>{t('common.noData', { defaultValue: '暂无数据' })}</div>
      ) : (
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
                  onClick={() => onTaskClick?.(task)}
                  disabled={task.completed || verifyingTaskId === task.id}
                >
                  {verifyingTaskId === task.id ? t('common.loading', { defaultValue: 'Loading...' }) : task.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

