import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '@/app/pointsdetail/page.module.less';
import SectionHeader from './SectionHeader';
import SectionSkeleton from './SectionSkeleton';
import DeferredImg from './DeferredImg';

const DailyTasks = ({ dailyInvestments, loading, onTaskClick }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.taskListSection}>
      <SectionHeader iconSrc="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/task_daily.svg" iconAlt="Task" title={t('pointsDetail.dailyTasks')} />
      {loading ? (
        <SectionSkeleton count={5} />
      ) : dailyInvestments.length === 0 ? (
        <div className={styles.emptyState}>
          <img
            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/no_task.svg"
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
          {dailyInvestments.map((task) => (
            <div
              key={task.id}
              className={styles.dailyTaskItem}
              role={onTaskClick ? 'button' : undefined}
              tabIndex={onTaskClick ? 0 : undefined}
              onClick={onTaskClick ? () => onTaskClick(task) : undefined}
              onKeyDown={
                onTaskClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') onTaskClick(task);
                    }
                  : undefined
              }
            >
              {(() => {
                const isPushArticleIcon = !!task?.icon?.includes('push_article.svg');
                const iconSize = isPushArticleIcon ? 52 : 36;
                return (
              <div
                className={[
                  styles.dailyTaskIconWrapper,
                  isPushArticleIcon ? styles.dailyTaskIconWrapperLarge : '',
                ].join(' ')}
              >
                <DeferredImg src={task.icon} alt={task.title} width={iconSize} height={iconSize} />
              </div>
                );
              })()}
              <div className={styles.dailyTaskContent}>
                <div className={styles.dailyTaskTitle}>{t(task.titleKey) || task.title}</div>
                <div className={styles.dailyTaskMetaRow}>
                  <div className={styles.dailyTaskReward}>
                    <span>+{task.reward}</span>
                    <DeferredImg
                      src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/new_coin.svg"
                      className={styles.rewardIcon}
                      alt="point"
                      width={14}
                      height={14}
                    />
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
                    <div className={styles.progressText}>
                      {task.current}/{task.target}
                    </div>
                  </div>
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

