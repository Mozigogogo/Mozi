'use client';

import { useMemo, useState } from 'react';
import { ThunderboltFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

function ItemAvatar({ avatar, account }) {
  const fallback = String(account || '').trim().slice(0, 1).toUpperCase() || 'N';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className={styles.itemAvatar}
        onError={(e) => {
          e.currentTarget.src = '/default-avatar.png';
        }}
      />
    );
  }

  return (
    <span className={styles.itemAvatarFallback} aria-hidden>
      {fallback}
    </span>
  );
}

/**
 * 社区页顶部 24H 快讯横向滚动条
 */
export default function PCFlashNewsTicker({
  items = [],
  loading = false,
  onItemClick,
}) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const hasItems = items.length > 0;

  const trackItems = useMemo(() => {
    if (!hasItems) return [];
    // 保证单段足够长，再复制一份做无缝循环（translateX -50%）
    let segment = [...items];
    while (segment.length > 0 && segment.length < 6) {
      segment = segment.concat(items);
    }
    return [
      ...segment.map((item, idx) => ({ ...item, _key: `a-${item?.id ?? idx}-${idx}` })),
      ...segment.map((item, idx) => ({ ...item, _key: `b-${item?.id ?? idx}-${idx}` })),
    ];
  }, [hasItems, items]);

  const durationSec = Math.max(28, Math.min(90, Math.ceil(trackItems.length / 2) * 4));

  return (
    <div
      className={styles.ticker}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.label}>
        <span className={styles.logo} aria-hidden>
          <ThunderboltFilled />
        </span>
        <span className={styles.labelText}>{t('pcCommunity.flashNewsTitle')}</span>
      </div>

      <div className={styles.viewport}>
        {hasItems ? (
          <div
            className={`${styles.track} ${paused ? styles.trackPaused : ''}`}
            style={{ '--ticker-duration': `${durationSec}s` }}
          >
            {trackItems.map((item) => (
              <button
                key={item._key}
                type="button"
                className={styles.item}
                onClick={() => onItemClick?.(item)}
                title={item.title}
              >
                <ItemAvatar avatar={item.avatar} account={item.account} />
                <span className={styles.itemTitle}>{item.title}</span>
                {item.account ? (
                  <span className={styles.itemMeta}>{item.account}</span>
                ) : null}
                <span className={styles.sep} aria-hidden>
                  |
                </span>
              </button>
            ))}
          </div>
        ) : loading ? (
          <div className={styles.placeholder}>{t('community.actions.loading')}</div>
        ) : (
          <div className={styles.placeholder}>{t('pcCommunity.noFlashNews')}</div>
        )}
      </div>
    </div>
  );
}
