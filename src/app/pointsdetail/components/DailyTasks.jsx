import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../page.module.less';
import SectionHeader from './SectionHeader';
import SectionSkeleton from './SectionSkeleton';

const DailyTasks = ({ dailyInvestments, loading }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.taskListSection}>
      <SectionHeader iconSrc="/point/task_daily.svg" iconAlt="Task" title={t('pointsDetail.dailyTasks')} />
      {loading ? (
        <SectionSkeleton count={5} />
      ) : (
      <div className={styles.taskList}>
        {dailyInvestments.map(task => (
          <div key={task.id} className={styles.dailyTaskItem}>
            <div className={styles.dailyTaskIconWrapper} style={{ backgroundColor: task.bgColor }}>
              <img src={task.icon} alt={task.title} />
            </div>
            <div className={styles.dailyTaskContent}>
              <div className={styles.dailyTaskTitle}>{t(task.titleKey) || task.title}</div>
              <div className={styles.dailyTaskReward}>
                <span>+{task.reward}</span>
                <img src="/point/coin_icon@2x.png" className={styles.rewardIcon} alt="point" />
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressTrack}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${Math.min((task.current / task.target) * 100, 100)}%` }}
                  >
                    <div className={styles.progressKnob}>{task.current}</div>
                  </div>
                </div>
                <div className={styles.progressText}>{task.current}/{task.target}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default DailyTasks;
