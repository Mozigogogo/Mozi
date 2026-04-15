'use client';

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

  return (
    <div className={wrapperClassName}>
      <div className={styles.pager} role="navigation" aria-label="pagination">
        <button
          type="button"
          className={styles.pagerBtn}
          onClick={() => onChange?.(Math.max(1, currentPage - 1))}
          disabled={loading || currentPage <= 1 || totalPages <= 1}
        >
          上一页
        </button>

        <div className={styles.pages}>
          {pageItems.map((it, idx) =>
            it === '...' ? (
              <span key={`ellipsis-${idx}`} className={styles.ellipsis} aria-hidden>
                ...
              </span>
            ) : (
              <button
                key={it}
                type="button"
                className={`${styles.pageBtn} ${it === currentPage ? styles.activePage : ''}`}
                onClick={() => onChange?.(it)}
                disabled={loading || it === currentPage}
                aria-current={it === currentPage ? 'page' : undefined}
              >
                {it}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className={styles.pagerBtn}
          onClick={() => onChange?.(Math.min(totalPages, currentPage + 1))}
          disabled={loading || currentPage >= totalPages || totalPages <= 1}
        >
          下一页
        </button>

        {showTotalPages ? <span className={styles.totalPages}>{totalPages}</span> : null}
      </div>
    </div>
  );
}
