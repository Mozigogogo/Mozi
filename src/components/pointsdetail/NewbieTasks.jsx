import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';
import SectionHeader from './SectionHeader';
import SectionSkeleton from './SectionSkeleton';
import DeferredImg from './DeferredImg';

const NewbieTasks = ({ tasksList, handleTaskClick, loading, verifyingTaskId }) => {
  const { t, i18n } = useTranslation();
  const isEn = String(i18n?.language || '').toLowerCase().startsWith('en');

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
            (() => {
              const isCompleted = task?.isCompleted === true || task?.status === 'completed';
              return (
            <div key={task.id} className={styles.taskItem}>
              <div className={styles.taskIconWrapper}>
                <DeferredImg
                  src={task.icon}
                  alt={task.title}
                  className={styles.taskIconImg}
                  width={36}
                  height={36}
                />
              </div>
              <div className={styles.taskInfo}>
                <div className={styles.taskName}>
                  {t(task.titleKey) || task.title}
                </div>
                <div className={styles.taskMetaRow}>
                  <div className={styles.dailyTaskReward}>
                    <span>+{task.points}</span>
                    <DeferredImg src="/point/new_coin.svg" className={styles.rewardIcon} alt="point" width={14} height={14} />
                  </div>
                  {(task.taskCode === 'PUSH' || task.taskCode === 'FIRST_POST') && (
                    <div className={styles.taskSubText}>{t('pointsDetail.tasks.push.note') || 'more than 50'}</div>
                  )}
                  {(task.taskCode === 'ADD' || task.taskCode === 'ADD_WATCHLIST') && (
                    <div className={styles.taskSubText}>{t('pointsDetail.tasks.add.note') || 'more than 3'}</div>
                  )}
                </div>
              </div>
              <div className={styles.taskRewardPill}>
                <span>+{task.points}</span>
              </div>
              <button
                className={`${styles.taskBtn} ${isEn ? styles.taskBtnEn : ''} ${isCompleted ? styles.completed : ''} ${
                  isCompleted && (task.taskCode === 'REGISTER' || task.taskCode === 'FIRST_LOGIN')
                    ? styles.firstLoginCompletedBtn
                    : ''
                } ${
                  task.taskCode === 'ALARM' || task.taskCode === 'SET_ALARM' ? styles.setupBtn : ''
                } ${
                  task.taskCode === 'COMPLETE_PROFILE' || task.taskCode === 'USER_INFO' ? styles.profileBtn : ''
                } ${
                  task.taskCode === 'PUSH' || task.taskCode === 'FIRST_POST' ? styles.postBtn : ''
                } ${
                  task.taskCode === 'ADD' || task.taskCode === 'ADD_WATCHLIST' ? styles.addBtn : ''
                } ${
                  task.taskCode === 'EARLY_BIRD' ? styles.loginBtn : ''
                } ${
                  task.taskCode === 'FOLLOW_TWITTER' || task.taskCode === 'TWITTER' ? styles.followBtn : ''
                } ${
                  task.taskCode === 'COMMUNITY' || task.taskCode === 'JOIN_COMMUNITY' ? styles.joinBtn : ''
                } ${
                  verifyingTaskId === task.id
                    ? styles.loading
                    : !task.needsAction && !isCompleted
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
                ) : isCompleted ? (
                  t('pointsDetail.completed')
                ) : !task.needsAction ? (
                  t('pointsDetail.verify') || '验证'
                ) : (
                  t(task.btnTextKey) || t('pointsDetail.goFinish')
                )}
              </button>
            </div>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
};

export default NewbieTasks;

