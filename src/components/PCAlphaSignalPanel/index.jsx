'use client';

import SignalCard from '@/components/SignalCard';
import AiRobotUpgradePillButton from '@/components/AiRobotUpgradePillButton';
import styles from './index.module.less';

/** 假数据 — 结构与 SSE signal_card 一致，后续接入真实 API */
export const MOCK_SIDEBAR_SIGNAL_CARD = {
  card: {
    coin: 'BTC',
    direction: 'long',
    grade: 'S',
    confidence: 78,
    current_price: 60500,
    entry_zone: [58544, 61435],
    stop_loss: 57200,
    take_profit: 64800,
    risk_reward: 2.2,
    kelly_pct: 18,
    position_pct: 15,
    sources: [
      { name: 'bigorder_anomaly', score: 72 },
      { name: 'quantitative', score: 65 },
      { name: 'technical', score: 65 },
    ],
  },
  strategy: { version: 2 },
};

export default function PCAlphaSignalPanel({
  signalData = MOCK_SIDEBAR_SIGNAL_CARD,
  alertCount = 3,
  showUpgrade = false,
  onUpgrade,
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
          <div className={styles.titleRow}>
            <span className={styles.titleDot} aria-hidden />
            今日 Alpha 信号
          </div>
          <div className={styles.reminderBox}>
            🔥 探测到{alertCount}个S级/A级多维共振交易机会
          </div>
        </div>

        <div className={styles.signalCardWrap}>
          <SignalCard data={signalData} variant="sidebar" />
        </div>
      </div>
      </div>
    </div>
  );
}
