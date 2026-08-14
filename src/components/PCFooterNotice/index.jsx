'use client';

import { useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeProvider';
import styles from './index.module.less';

/**
 * PC端底部公告栏组件
 * @param {Array} notices - 公告列表，支持 string 或 { id, text }
 * @param {string} backgroundColor - 背景色，默认 #E6F7F1
 * @param {string} textColor - 文字颜色，默认 #11B787
 * @param {number} speed - 滚动速度（秒），默认 30
 * @param {boolean} collapsed - 侧边栏是否收起
 * @param {Function} onItemClick - 点击某条公告回调
 */
export default function PCFooterNotice({
  notices = [],
  backgroundColor = '#E6F7F1',
  textColor = '#11B787',
  speed = 30,
  collapsed = false,
  onItemClick,
}) {
  const [paused, setPaused] = useState(false);
  const { isDark } = useTheme();
  const resolvedBackground = isDark ? '#13241e' : backgroundColor;
  const resolvedTextColor = isDark ? '#34d399' : textColor;

  const items = useMemo(
    () =>
      (notices || [])
        .map((item, index) => {
          if (item == null) return null;
          if (typeof item === 'string') {
            const text = item.trim();
            if (!text) return null;
            return { id: `notice-${index}`, text, clickable: false };
          }
          if (typeof item === 'object') {
            const text = String(item.text || item.title || item.content || '').trim();
            if (!text) return null;
            const id = item.id ?? item.postId ?? `notice-${index}`;
            return {
              id,
              text,
              clickable: Boolean(item.id || item.postId || onItemClick),
            };
          }
          return null;
        })
        .filter(Boolean),
    [notices, onItemClick]
  );

  if (!items.length) return null;

  const handleItemClick = (item) => {
    if (!item?.clickable) return;
    onItemClick?.(item);
  };

  return (
    <div
      className={`${styles.footerNotice} ${collapsed ? styles.footerNoticeCollapsed : ''} ${
        onItemClick ? styles.footerNoticeInteractive : ''
      }`}
      style={{
        backgroundColor: resolvedBackground,
        '--text-color': resolvedTextColor,
        '--animation-duration': `${speed}s`,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={`${styles.noticeContent} ${paused ? styles.noticeContentPaused : ''}`}>
        {[0, 1].map((loop) => (
          <div key={loop} className={styles.noticeGroup}>
            {items.map((item, index) => (
              <span key={`${loop}-${item.id}-${index}`} className={styles.noticeItemWrap}>
                {index > 0 ? <span className={styles.noticeSep}>|</span> : null}
                {item.clickable ? (
                  <button
                    type="button"
                    className={`${styles.noticeText} ${styles.noticeTextClickable}`}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.text}
                  </button>
                ) : (
                  <span className={styles.noticeText}>{item.text}</span>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
