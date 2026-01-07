'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Spin } from 'antd';
import styles from './index.module.less';

/**
 * PC端话题搜索下拉面板组件
 */
export default function PCTopicSearchModal({
  visible = false,
  onClose,
  results = [],
  loading = false,
  onTopicClick,
  nov1Icon = '/icons/nov1.svg',
  nov2Icon = '/icons/nov2.svg',
  nov3Icon = '/icons/nov3.svg',
  hotIcon = '/icons/hot.svg',
}) {
  const { t } = useTranslation();
  const panelRef = useRef(null);

  // 点击外部关闭
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // 检查是否点击了搜索框（不关闭）
        const searchInput = e.target.closest('input[type="text"]');
        if (!searchInput) {
          onClose?.();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  // ESC 关闭
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const handleTopicClick = (topic) => {
    onTopicClick?.(topic.id, topic.name, topic.description);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <div ref={panelRef} className={styles.dropdownPanel}>
      {/* 搜索结果 */}
      <div className={styles.resultList}>
        {loading ? (
          <div className={styles.loadingWrapper}>
            <Spin />
          </div>
        ) : results.length > 0 ? (
          results.map((topic, index) => (
            <div
              key={topic.id}
              className={styles.resultItem}
              onClick={() => handleTopicClick(topic)}
            >
              {/* 左侧排名 */}
              <div className={styles.rankCol}>
                {index === 0 ? (
                  <img className={styles.rankMedal} src={nov1Icon} alt="1" />
                ) : index === 1 ? (
                  <img className={styles.rankMedal} src={nov2Icon} alt="2" />
                ) : index === 2 ? (
                  <img className={styles.rankMedal} src={nov3Icon} alt="3" />
                ) : (
                  <span className={styles.rankNum}>{index + 1}</span>
                )}
              </div>

              {/* 中间内容 */}
              <div className={styles.topicContent}>
                {/* 标题行：标题 + 热度图标 */}
                <div className={styles.titleRow}>
                  <span className={styles.topicName}>{topic.name}</span>
                  <img className={styles.hotIcon} src={hotIcon} alt="hot" />
                </div>
                {/* 描述 */}
                <div className={styles.topicDesc}>
                  {topic.description || t('community.actions.noDescription')}
                </div>
                {/* 时间 */}
                <div className={styles.timeText}>
                  {topic.createdAt?.replace('T', ' ')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyWrapper}>
            <span>{t('topicSearch.noResults')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
