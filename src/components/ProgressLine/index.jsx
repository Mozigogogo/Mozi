import React from 'react';
import styles from './index.module.less';

const tierMeta = {
  free: { label: 'Free', cls: 'tierStop_free' },
  lite: { label: 'Lite', cls: 'tierStop_lite' },
  pro: { label: 'Pro', cls: 'tierStop_pro' },
};

export default function ProgressLine({ activeTier = 'free', className }) {
  const active = tierMeta[activeTier] ? activeTier : 'free';

  return (
    <div className={`${styles.tierRail} ${className || ''}`.trim()}>
      <div className={styles.tierRailLine} aria-hidden />

      {['free', 'lite', 'pro'].map((tier) => {
        const meta = tierMeta[tier];
        const isActive = tier === active;

        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={tier}
            className={`${styles.tierStop} ${styles[meta.cls]} ${isActive ? styles.tierStopActive : ''}`}
          >
            <span className={styles.tierDot} />
            <div className={styles.tierStopLabel}>{meta.label}</div>
          </div>
        );
      })}
    </div>
  );
}

