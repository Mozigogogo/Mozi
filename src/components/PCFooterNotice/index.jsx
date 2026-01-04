'use client';

import { useState, useEffect } from 'react';
import styles from './index.module.less';

/**
 * PC端底部公告栏组件
 * @param {Array} notices - 公告文本数组
 * @param {string} backgroundColor - 背景色，默认 #E6F7F1
 * @param {string} textColor - 文字颜色，默认 #11B787
 * @param {number} speed - 滚动速度（秒），默认 30
 * @param {boolean} collapsed - 侧边栏是否收起
 */
export default function PCFooterNotice({ 
  notices = [], 
  backgroundColor = '#E6F7F1',
  textColor = '#11B787',
  speed = 30,
  collapsed = false
}) {
  const [noticeText, setNoticeText] = useState('');

  useEffect(() => {
    if (notices && notices.length > 0) {
      // 将所有公告用分隔符连接，形成连续滚动效果
      const text = notices.join('    |    ');
      setNoticeText(text);
    }
  }, [notices]);

  if (!notices || notices.length === 0) {
    return null;
  }

  return (
    <div 
      className={`${styles.footerNotice} ${collapsed ? styles.footerNoticeCollapsed : ''}`}
      style={{ 
        backgroundColor,
        '--text-color': textColor,
        '--animation-duration': `${speed}s`
      }}
    >
      <div className={styles.noticeContent}>
        <span className={styles.noticeText}>{noticeText}</span>
        <span className={styles.noticeText}>{noticeText}</span>
      </div>
    </div>
  );
}
