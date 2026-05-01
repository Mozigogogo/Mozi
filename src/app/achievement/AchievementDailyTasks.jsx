'use client';

import { useTranslation } from 'react-i18next';
import { Loading } from '@/components/Loading';
import styles from './AchievementDailyTasks.module.less';

export default function AchievementDailyTasks({ tasks, onTaskClick, loading = false }) {
  const { t } = useTranslation();
  const renderTasks = Array.isArray(tasks) ? tasks : [];

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/task_daily.svg" alt="daily task" className={styles.headerIcon} />
        <h3 className={styles.title}>
          {t('pointsDetail.dailyTasks', { defaultValue: 'Daily Quest Reward' })}
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
          {renderTasks.map((task) => {
            const cur = Number(task.current || 0);
            const tar = Math.max(1, Number(task.target || 1));
            const progress = Math.max(0, Math.min(100, (cur / tar) * 100));
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
                          <span className={styles.progressDot}>{cur}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.counter}>
                  <button type="button" className={styles.counterBtn} onClick={() => onTaskClick?.(task)}>
                    {cur}/{tar}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

