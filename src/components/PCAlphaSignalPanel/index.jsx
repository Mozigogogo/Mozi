'use client';

import SignalCard from '@/components/SignalCard';
import AiRobotUpgradePillButton from '@/components/AiRobotUpgradePillButton';
import { MOCK_SIDEBAR_SIGNAL_CARD } from '@/data/mockAlphaSignalCards';
import styles from './index.module.less';

export { MOCK_SIDEBAR_SIGNAL_CARD };

export default function PCAlphaSignalPanel({
  signalData = MOCK_SIDEBAR_SIGNAL_CARD,
  alertCount = 3,
  showUpgrade = false,
  onUpgrade,
  onViewMore,
  upgradeLabel = '升级到 mozi Pro',
  upgradeAriaLabel = '升级到 mozi Pro',
}) {
  return (
    <div className={styles.wrapper}>
      {showUpgrade ? (
        <div className={styles.upgradeRow}>
          <AiRobotUpgradePillButton
            onClick={onUpgrade}
            ariaLabel={upgradeAriaLabel}
            label={upgradeLabel}
            className={styles.upgradeBtn}
          />
        </div>
      ) : null}

      <div className={styles.centerBody}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.textRow}>
              <span className={styles.leadIcon} aria-hidden>
                <span className={styles.titleDot} />
              </span>
              <span className={styles.titleText}>今日 Alpha 信号</span>
            </div>
            <button
              type="button"
              className={`${styles.reminderBox} ${styles.textRow}`}
              onClick={onViewMore}
            >
              <span className={styles.leadIcon} aria-hidden>
                🔥
              </span>
              <span className={styles.reminderText}>
                探测到{alertCount}个S级/A级多维共振交易机会
              </span>
            </button>
          </div>

          <div
            className={styles.signalCardWrap}
            role="button"
            tabIndex={0}
            onClick={onViewMore}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewMore?.();
              }
            }}
          >
            <SignalCard data={signalData} variant="sidebar" onViewMore={onViewMore} />
          </div>
        </div>
      </div>
    </div>
  );
}
