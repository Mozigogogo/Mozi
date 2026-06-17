'use client';

import { useTranslation } from 'react-i18next';
import SignalCard from '@/components/SignalCard';
import SignalCardAmbient from '@/components/SignalCard/SignalCardAmbient';
import signalCardStyles from '@/components/SignalCard/index.module.less';
import AiRobotUpgradePillButton from '@/components/AiRobotUpgradePillButton';
import { getLocalizedSidebarSignalCard } from '@/data/mockAlphaSignalCards';
import styles from './index.module.less';

export default function PCAlphaSignalPanel({
  signalData,
  alertCount = 3,
  showUpgrade = false,
  onUpgrade,
  onViewMore,
  upgradeLabel,
  upgradeAriaLabel,
  inline = false,
  className = '',
}) {
  const { t } = useTranslation();
  const resolvedSignalData = signalData ?? getLocalizedSidebarSignalCard(t);
  const resolvedUpgradeLabel = upgradeLabel ?? t('aiAssistant.title');
  const resolvedUpgradeAriaLabel = upgradeAriaLabel ?? t('aiAssistant.title');

  return (
    <div
      className={`${styles.wrapper} ${inline ? styles.wrapperInline : ''} ${className}`.trim()}
    >
      {showUpgrade ? (
        <div className={styles.upgradeRow}>
          <AiRobotUpgradePillButton
            onClick={onUpgrade}
            ariaLabel={resolvedUpgradeAriaLabel}
            label={resolvedUpgradeLabel}
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
              <span className={styles.titleText}>{t('signalCard.alphaPanel.title')}</span>
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
                {t('signalCard.alphaPanel.alert', { count: alertCount })}
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
            <SignalCardAmbient
              grade={resolvedSignalData?.card?.grade}
              className={signalCardStyles.panelAmbientGlow}
            />
            <div className={styles.signalCardInner}>
              <SignalCard
                data={resolvedSignalData}
                variant="sidebar"
                hideAmbient
                surfaceHosted
                onViewMore={onViewMore}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
