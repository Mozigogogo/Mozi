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
  nov1Icon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/nov1.svg',
  nov2Icon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/nov2.svg',
  nov3Icon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/nov3.svg',
  hotIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/hot.svg',
  searchKeyword = '', // 新增：搜索关键词
}) {
  const { t } = useTranslation();
  const panelRef = useRef(null);

  // 高亮关键词函数
  const highlightKeyword = (text, keyword) => {
    if (!keyword || !text) return text;
    
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === keyword.toLowerCase()) {
        return <span key={index} className={styles.highlight}>{part}</span>;
      }
      return part;
    });
  };

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
              {/* 中间内容 */}
              <div className={styles.topicContent}>
                {/* 标题行：标题 + 热度图标 */}
                <div className={styles.titleRow}>
                  <span className={styles.topicName}>
                    {highlightKeyword(topic.name, searchKeyword)}
                  </span>
                  <img className={styles.hotIcon} src={hotIcon} alt="hot" />
                </div>
                {/* 描述 */}
                <div className={styles.topicDesc}>
                  {highlightKeyword(topic.description || t('community.actions.noDescription'), searchKeyword)}
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
