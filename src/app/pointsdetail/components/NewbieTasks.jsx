import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../page.module.less';
import SectionHeader from './SectionHeader';

const NewbieTasks = ({ tasksList, handleTaskClick }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.taskListSection}>
      <SectionHeader iconSrc="/point/new_alert.svg" iconAlt="Task" title={t('pointsDetail.newbieTasks')} />
      <div className={styles.taskList}>
        {tasksList.map(task => (
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
              className={`${styles.taskBtn} ${task.status === 'completed' ? styles.completed : ''}`}
              onClick={() => handleTaskClick(task)}
            >
              {task.status === 'completed' ? t('pointsDetail.completed') : (t(task.btnTextKey) || t('pointsDetail.goFinish'))}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewbieTasks;
