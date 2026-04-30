'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import ProgressLine from '@/components/ProgressLine';
import styles from './index.module.less';

export default function PlanCardLite({
  title = 'Lite',
  subtitle,
  pointsCur = 4518,
  pointsMax = 5000,
  validUntil,
  daysLeft,
  activeTier = 'lite',
  onPro2Upgrade,
  isPc = false,
}) {
  const { t } = useTranslation();
  const isPro = activeTier === 'pro';
  const tierIconSrc = isPro ? '/benefits/vip_pro1.svg' : '/benefits/flag.svg';
  const curNum = typeof pointsCur === 'number' ? pointsCur : Number(pointsCur);
  const maxNum = typeof pointsMax === 'number' ? pointsMax : Number(pointsMax);
  const percent = maxNum > 0 ? Math.max(0, Math.min(100, (curNum / maxNum) * 100)) : 0;

  // Next-tier (Pro-2) demo values to match the design mock.
  const pro2ExpCur = 7800;
  const pro2ExpMax = 10000;
  const pro2ExpRemaining = pro2ExpMax - pro2ExpCur;
  const pro2ProgressPercent = pro2ExpMax > 0 ? Math.max(0, Math.min(100, (pro2ExpCur / pro2ExpMax) * 100)) : 0;
  const pro2PointsPerMonth = 120000;
  const pro2AiCallsPerMonth = 60;

  return (
    <>
      <div className={`${styles.planCard} ${isPro ? styles.planCardPro : styles.planCardLite} ${isPc ? styles.pcMode : ''}`}>
        <div className={styles.headerRow}>
          <div className={styles.planTop}>
            <div className={styles.planTitle}>{title}</div>
            <div className={styles.planSub}>{subtitle}</div>
          </div>

          <img className={styles.tierIcon} src={tierIconSrc} alt="" aria-hidden />
        </div>

        <div className={isPro ? styles.proPointsSection : styles.pointsSection}>
          <div className={styles.pointsLabel}>{t('benefitsPage.pointsThisMonth')}</div>

          {isPro ? (
            <>
              <div className={styles.pointsRow}>
                <span className={styles.pointsCur}>{curNum.toLocaleString()}</span>
                <span className={styles.pointsSlash}>/</span>
                <span className={styles.pointsMax}>{maxNum.toLocaleString()}</span>
              </div>

              <div className={styles.progressTrack} aria-hidden>
                <div
                  className={`${styles.progressFill} ${styles.progressFillPro}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className={styles.proProgressSpacer} aria-hidden />

              <div className={styles.proValidityRow}>
                <div className={styles.validText}>
                  {validUntil ? t('benefitsPage.validUntil', { tier: 'Pro', date: validUntil }) : null}
                </div>
                {!!daysLeft && <div className={styles.daysTag}>{t('benefitsPage.daysLeftTag', { n: daysLeft })}</div>}
              </div>

              <div className={styles.proValidityDivider} aria-hidden />

              <div className={styles.proNextTierCard}>
                <div className={styles.proNextTierHeader}>
                  <img
                    className={styles.proNextTierHexBadge}
                    src="/benefits/vip_pro2.svg"
                    alt=""
                    aria-hidden="true"
                  />
                  <div className={styles.proNextTierHeaderContent}>
                    <div className={styles.proNextTierTitleRow}>
                      <div className={styles.proNextTierTitle}>{t('benefitsPage.nextLevelCardTitle')}</div>
                      <div className={styles.proNextTierExpText}>
                        {t('benefitsPage.nextLevelProgress', {
                          current: pro2ExpCur.toLocaleString(),
                          max: pro2ExpMax.toLocaleString()
                        })}
                      </div>
                    </div>
                    <div className={styles.proNextTierProgressTrack} aria-hidden>
                      <div
                        className={styles.proNextTierProgressFill}
                        style={{ width: `${pro2ProgressPercent}%` }}
                      />
                    </div>
                    <div className={styles.proNextTierSub}>
                      {t('benefitsPage.nextLevelRemaining', { remaining: pro2ExpRemaining.toLocaleString() })}
                    </div>
                  </div>
                </div>

                <div className={styles.proNextTierBottomRow}>
                  <div className={styles.proNextTierRewards}>
                    {t('benefitsPage.nextLevelRewards', {
                      points: pro2PointsPerMonth.toLocaleString(),
                      ai: pro2AiCallsPerMonth
                    })}
                  </div>
                  <button
                    className={styles.proNextTierQuickUp}
                    type="button"
                    onClick={onPro2Upgrade}
                  >
                    {t('benefitsPage.quickUpgrade')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.pointsRow}>
                <span className={styles.pointsCur}>{curNum.toLocaleString()}</span>
                <span className={styles.pointsSlash}>/</span>
                <span className={styles.pointsMax}>{maxNum.toLocaleString()}</span>
              </div>

              <div className={styles.progressTrack} aria-hidden>
                <div className={styles.progressFill} style={{ width: `${percent}%` }} />
              </div>
            </>
          )}
        </div>

        {!isPro && (
          <div className={styles.validRow}>
            <div className={styles.validText}>
              {validUntil ? t('benefitsPage.validUntil', { tier: title, date: validUntil }) : null}
            </div>

            {!!daysLeft && <div className={styles.daysTag}>{t('benefitsPage.daysLeftTag', { n: daysLeft })}</div>}
          </div>
        )}
      </div>

      {!isPc && <ProgressLine activeTier={activeTier} />}
    </>
  );
}

