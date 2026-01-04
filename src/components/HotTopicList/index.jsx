'use client';
import { SpinLoading } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/**
 * 热门话题列表组件
 * @param {Array} topics - 话题列表数据
 * @param {boolean} loading - 加载状态
 * @param {boolean} allLoaded - 是否已加载全部
 * @param {boolean} pullRefresh - 是否正在下拉刷新
 * @param {Function} onTopicClick - 话题点击回调
 * @param {string} nov1Icon - 第1名图标
 * @param {string} nov2Icon - 第2名图标
 * @param {string} nov3Icon - 第3名图标
 * @param {string} hotIcon - 热度图标
 */
export default function HotTopicList({
  topics = [],
  loading = false,
  allLoaded = false,
  pullRefresh = false,
  onTopicClick,
  nov1Icon,
  nov2Icon,
  nov3Icon,
  hotIcon
}) {
  const { t } = useTranslation();

  return (
    <div className={styles.hotTopics}>
      {topics.length > 0 && topics.map((topic, index) => (
        <div 
          key={topic.id} 
          className={styles.hotTopicItem} 
          onClick={() => onTopicClick?.(topic.id, topic.name, topic.description)}
        >
          {/* 排名 */}
          <div className={`${styles.topicRank} ${index < 3 ? styles.medalRank : ''}`}>
            {index === 0 ? (
              <img className={styles.rankMedal} src={nov1Icon} alt="第1名" />
            ) : index === 1 ? (
              <img className={styles.rankMedal} src={nov2Icon} alt="第2名" />
            ) : index === 2 ? (
              <img className={styles.rankMedal} src={nov3Icon} alt="第3名" />
            ) : (
              index + 1
            )}
          </div>

          {/* 话题信息 */}
          <div className={styles.topicInfo}>
            <span className={styles.topicTitle}>{topic.name}</span>
            <span className={styles.topicDesc}>
              {topic.description || t('community.actions.noDescription')}
            </span>
          </div>

          {/* 右侧信息 */}
          <div className={styles.topicRightInfo}>
            <div className={styles.heatText}>
              <img className={styles.heatIcon} src={hotIcon} alt="热度" />
              <span className={styles.heatValue}>{topic.score || 0}</span>
            </div>
            <span className={styles.timeText}>
              {topic.createdAt?.replace('T', '    ')}
            </span>
          </div>
        </div>
      ))}

      {loading && !pullRefresh && (
        <div 
          className={styles.loadingMore} 
          style={topics.length === 0 ? { paddingTop: '60px' } : {}}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <SpinLoading color="#00b578" style={{ '--size': '24px' }} />
            <span style={{ fontSize: '14px', color: '#999' }}>
              {t('community.actions.loading')}
            </span>
          </div>
        </div>
      )}

      {allLoaded && topics.length > 0 && (
        <div className={styles.listFooter}>
          <span>{t('community.actions.reachedBottom')}</span>
        </div>
      )}

      {!loading && topics.length === 0 && (
        <div className={styles.emptyContent}>
          <span>{t('community.actions.noMoreContent')}</span>
        </div>
      )}
    </div>
  );
}
