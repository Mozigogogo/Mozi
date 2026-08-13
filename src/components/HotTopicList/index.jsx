'use client';
import { SpinLoading } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import PCPagination from '@/components/PCPagination';
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
 * @param {boolean} isPC - 是否为PC端，默认false
 */
export default function HotTopicList({
  topics = [],
  loading = false,
  allLoaded = false,
  pullRefresh = false,
  onTopicClick,
  onCreateTopic,
  nov1Icon,
  nov2Icon,
  nov3Icon,
  hotIcon,
  isPC = false,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
}) {
  const { t } = useTranslation();
  const getTopicTitle = (topic) => topic?.name || topic?.title || '';
  const getTopicDesc = (topic) => topic?.description || t('community.actions.noDescription');
  const getTopicTime = (topic) => (topic?.createdAt || topic?.createTime || '').replace('T', ' ');
  const getTopicHeat = (topic) => topic?.score || topic?.postCount || 0;
  // PC 分页 / 首次加载：整表骨架；移动端加载更多：底部 spinner
  const showPageSkeleton = loading && !pullRefresh && (isPC || topics.length === 0);
  const showLoadMoreSpinner = loading && !pullRefresh && !isPC && topics.length > 0;

  const skeletonBlock = (
    <div className={styles.topicListSkeleton} aria-busy="true" aria-label={t('community.actions.loading')}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.topicSkeletonItem}>
          <div className={styles.topicSkeletonRank} />
          <div className={styles.topicSkeletonInfo}>
            <div className={styles.topicSkeletonLine} style={{ width: '58%' }} />
            <div className={styles.topicSkeletonLine} style={{ width: '82%' }} />
          </div>
          <div className={styles.topicSkeletonRight}>
            <div className={styles.topicSkeletonLine} style={{ width: '40PX' }} />
            <div className={styles.topicSkeletonLine} style={{ width: '72PX' }} />
          </div>
        </div>
      ))}
    </div>
  );

  const listContent = (
    <>
      {showPageSkeleton
        ? skeletonBlock
        : topics.length > 0
          ? topics.map((topic, index) => (
        <div 
          key={topic.id} 
          className={styles.hotTopicItem} 
          onClick={() => onTopicClick?.(topic.id, getTopicTitle(topic), topic.description)}
        >
          {/* 排名 */}
          <div className={`${styles.topicRank} ${index < 3 ? styles.medalRank : ''}`}>
            {(page - 1) * pageSize + index === 0 ? (
              <img className={styles.rankMedal} src={nov1Icon} alt="第1名" />
            ) : (page - 1) * pageSize + index === 1 ? (
              <img className={styles.rankMedal} src={nov2Icon} alt="第2名" />
            ) : (page - 1) * pageSize + index === 2 ? (
              <img className={styles.rankMedal} src={nov3Icon} alt="第3名" />
            ) : (
              (page - 1) * pageSize + index + 1
            )}
          </div>

          {/* 话题信息 */}
          <div className={styles.topicInfo}>
            <span className={styles.topicTitle}>{getTopicTitle(topic)}</span>
            <span className={styles.topicDesc}>
              {getTopicDesc(topic)}
            </span>
          </div>

          {/* 右侧信息 */}
          <div className={styles.topicRightInfo}>
            <div className={styles.heatText}>
              <img className={styles.heatIcon} src={hotIcon} alt="热度" />
              <span className={styles.heatValue}>{getTopicHeat(topic)}</span>
            </div>
            <span className={styles.timeText}>
              {getTopicTime(topic)}
            </span>
          </div>
        </div>
      ))
          : null}

      {showLoadMoreSpinner ? (
        <div className={styles.loadingMore}>
          <div className={styles.loadingMoreInner}>
            <SpinLoading color="#00b578" style={{ '--size': '24px' }} />
            <span className={styles.loadingMoreText}>
              {t('community.actions.loading')}
            </span>
          </div>
        </div>
      ) : null}

      {allLoaded && topics.length > 0 && !loading && (
        <div className={styles.listFooter}>
          <span>{t('community.actions.reachedBottom')}</span>
        </div>
      )}

      {!loading && topics.length === 0 && (
        <div className={styles.emptyContent}>
          <span>{t('community.actions.noMoreContent')}</span>
        </div>
      )}
    </>
  );

  return (
    <div className={`${styles.hotTopics} ${isPC ? styles.pcMode : ''}`}>
      {isPC && (
        <div className={styles.pcHeader}>
          <div className={styles.pcHeaderTitle}>
            <span className={styles.pcHeaderDot} />
            <span className={styles.pcHeaderText}>{t('pcCommunity.hotRankingTitle')}</span>
            <span className={styles.pcHeaderBadge}>{t('pcCommunity.hotBadge')}</span>
          </div>
          <button
            type="button"
            className={styles.pcCreateButton}
            onClick={(e) => {
              e.stopPropagation();
              onCreateTopic?.();
            }}
          >
            {t('community.actions.createTopic')}
          </button>
        </div>
      )}

      {isPC ? <div className={styles.pcScrollArea}>{listContent}</div> : listContent}

      {isPC ? (
        <PCPagination
          className={styles.pcPagination}
          current={page}
          total={total}
          pageSize={pageSize}
          loading={loading}
          onChange={onPageChange}
        />
      ) : null}
    </div>
  );
}
