'use client';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import styles from './index.module.less';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPageItems(current, totalPages, maxButtons = 5) {
  const safeTotal = Math.max(0, Number(totalPages) || 0);
  const safeCurrent = clamp(Number(current) || 1, 1, Math.max(1, safeTotal));
  if (safeTotal <= maxButtons) {
    return Array.from({ length: safeTotal }, (_, idx) => idx + 1);
  }

  const windowSize = Math.max(1, maxButtons - 2);
  const half = Math.floor(windowSize / 2);
  let start = safeCurrent - half;
  let end = safeCurrent + (windowSize - half - 1);

  if (start < 2) {
    start = 2;
    end = start + windowSize - 1;
  }
  if (end > safeTotal - 1) {
    end = safeTotal - 1;
    start = end - windowSize + 1;
  }

  const items = [1];
  if (start > 2) items.push('...');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < safeTotal - 1) items.push('...');
  items.push(safeTotal);
  return items;
}

export default function PCPagination({
  current = 1,
  total = 0,
  pageSize = 10,
  loading = false,
  onChange,
  maxButtons = 5,
  className = '',
  showTotalPages = false,
  alwaysShow = false,
}) {
  const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / Math.max(1, Number(pageSize) || 1)));
  const currentPage = clamp(Number(current) || 1, 1, totalPages);
  const pageItems = getPageItems(currentPage, totalPages, maxButtons);

  if (totalPages <= 1 && !alwaysShow) return null;

  const wrapperClassName = className ? `${styles.wrap} ${className}` : styles.wrap;
  const prevDisabled = loading || currentPage <= 1 || totalPages <= 1;
  const nextDisabled = loading || currentPage >= totalPages || totalPages <= 1;
  const onKeyActivate = (e, cb, disabled) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cb?.();
    }
  };

  return (
    <div className={wrapperClassName}>
      <div className={styles.pager} role="navigation" aria-label="pagination">
        <div
          role="button"
          tabIndex={prevDisabled ? -1 : 0}
          aria-disabled={prevDisabled}
          aria-label="上一页"
          className={`${styles.pagerBtn} ${prevDisabled ? styles.disabled : ''}`}
          onClick={() => {
            if (!prevDisabled) onChange?.(Math.max(1, currentPage - 1));
          }}
          onKeyDown={(e) =>
            onKeyActivate(e, () => onChange?.(Math.max(1, currentPage - 1)), prevDisabled)
          }
        >
          <LeftOutlined className={styles.arrowIcon} aria-hidden />
        </div>

        <div className={styles.pages}>
          {pageItems.map((it, idx) =>
            it === '...' ? (
              <span key={`ellipsis-${idx}`} className={styles.ellipsis} aria-hidden>
                ...
              </span>
            ) : (
              <div
                key={it}
                role="button"
                tabIndex={loading || it === currentPage ? -1 : 0}
                aria-disabled={loading || it === currentPage}
                className={`${styles.pageBtn} ${it === currentPage ? styles.activePage : ''} ${
                  loading && it !== currentPage ? styles.disabled : ''
                }`}
                onClick={() => {
                  if (!loading && it !== currentPage) onChange?.(it);
                }}
                onKeyDown={(e) => onKeyActivate(e, () => onChange?.(it), loading || it === currentPage)}
                aria-current={it === currentPage ? 'page' : undefined}
              >
                {it}
              </div>
            )
          )}
        </div>

        <div
          role="button"
          tabIndex={nextDisabled ? -1 : 0}
          aria-disabled={nextDisabled}
          aria-label="下一页"
          className={`${styles.pagerBtn} ${nextDisabled ? styles.disabled : ''}`}
          onClick={() => {
            if (!nextDisabled) onChange?.(Math.min(totalPages, currentPage + 1));
          }}
          onKeyDown={(e) =>
            onKeyActivate(e, () => onChange?.(Math.min(totalPages, currentPage + 1)), nextDisabled)
          }
        >
          <RightOutlined className={styles.arrowIcon} aria-hidden />
        </div>

        {showTotalPages ? <span className={styles.totalPages}>{totalPages}</span> : null}
      </div>
    </div>
  );
}
