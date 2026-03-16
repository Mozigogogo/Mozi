import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';
import SectionHeader from './SectionHeader';
import SectionSkeleton from './SectionSkeleton';

const NewbieTasks = ({ tasksList, handleTaskClick, loading, verifyingTaskId }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.taskListSection}>
      <SectionHeader iconSrc="/point/new_alert.svg" iconAlt="Task" title={t('pointsDetail.newbieTasks')} />
      {loading ? (
        <SectionSkeleton count={5} />
      ) : tasksList.length === 0 ? (
        <div className={styles.emptyState}>
          <img
            src="/point/no_task.svg"
            alt="no task"
            className={styles.emptyIcon}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <p className={styles.emptyText}>{t('pointsDetail.noTasks')}</p>
        </div>
      ) : (
        <div className={styles.taskList}>
          {tasksList.map((task) => (
            <div key={task.id} className={styles.taskItem}>
              <div className={styles.taskIconWrapper} style={{ backgroundColor: task.bgColor }}>
                <img src={task.icon} alt={task.title} className={styles.taskIconImg} />
              </div>
              <div className={styles.taskInfo}>
                <div className={styles.taskName}>
                  {t(task.titleKey) || task.title}
                  {(task.taskCode === 'PUSH' || task.taskCode === 'FIRST_POST') && (
                    <span style={{ color: 'rgba(142, 148, 157, 1)', fontSize: '12px', fontWeight: 'normal' }}>
                      {t('pointsDetail.tasks.push.note') || ' (大于50字)'}
                    </span>
                  )}
                  {(task.taskCode === 'ADD' || task.taskCode === 'ADD_WATCHLIST') && (
                    <span style={{ color: 'rgba(142, 148, 157, 1)', fontSize: '12px', fontWeight: 'normal' }}>
                      {t('pointsDetail.tasks.add.note') || ' (>=3个)'}
                    </span>
                  )}
                </div>
                <div className={styles.dailyTaskReward}>
                  <span>+{task.points}</span>
                  <img src="/point/coin_icon@2x.png" className={styles.rewardIcon} alt="point" />
                </div>
              </div>
              <button
                className={`${styles.taskBtn} ${task.status === 'completed' ? styles.completed : ''} ${
                  verifyingTaskId === task.id
                    ? styles.loading
                    : !task.needsAction && task.status !== 'completed'
                      ? styles.highlight
                      : ''
                }`}
                onClick={() => handleTaskClick(task)}
                disabled={verifyingTaskId === task.id}
              >
                {verifyingTaskId === task.id ? (
                  <>
                    <span className={styles.loadingSpinnerSmall} />
                    {t('pointsDetail.verifying') || '验证中...'}
                  </>
                ) : task.status === 'completed' ? (
                  t('pointsDetail.completed')
                ) : !task.needsAction ? (
                  t('pointsDetail.verify') || '验证'
                ) : (
                  t(task.btnTextKey) || t('pointsDetail.goFinish')
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewbieTasks;

