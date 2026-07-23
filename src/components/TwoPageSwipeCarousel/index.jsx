'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './index.module.less';

/**
 * 两页左右滑动翻页（左右拖拽 + 底部两个页点）
 * 使用场景：只希望在“合约专区卡片内部”发生滑动。
 */
export default function TwoPageSwipeCarousel({ pages = [], initialPage = 0 }) {
  const scrollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const safePages = useMemo(() => {
    const arr = Array.isArray(pages) ? pages : [];
    return [arr[0], arr[1]].filter(Boolean);
  }, [pages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth || 1;
      const page = Math.round(el.scrollLeft / w);
      setCurrentPage(page);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollLeft = Math.max(0, initialPage) * w;
  }, [initialPage]);

  return (
    <div className={styles.wrap}>
      <div className={styles.cardShell}>
        <div ref={scrollRef} className={styles.scrollWrapper} aria-label="两页滑动翻页">
          {safePages.map((node, idx) => (
            <div key={idx} className={styles.pageContainer}>
              {node}
            </div>
          ))}
        </div>

        {safePages.length === 2 && (
          <div className={styles.scrollIndicator} aria-hidden="true">
            <div className={`${styles.dot} ${currentPage === 0 ? styles.active : ''}`} />
            <div className={`${styles.dot} ${currentPage === 1 ? styles.active : ''}`} />
          </div>
        )}
      </div>
    </div>
  );
}

