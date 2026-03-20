'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import styles from './page.module.less';

const TIERS = ['free', 'lite', 'pro'];

const getTierLabel = (k) => {
  if (k === 'pro') return 'Pro';
  if (k === 'lite') return 'Lite';
  return 'Free';
};

function ProgressLine({ current, max, variant }) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  return (
    <div className={styles.progressTrack}>
      <div className={`${styles.progressFill} ${styles[`pf_${variant}`]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BenefitsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tier, setTier] = useState('free');

  const days = 259;
  const litePoints = { cur: 4518, max: 5000 };
  const liteAi = { cur: 12, max: 40 };
  const proPoints = { cur: 9518, max: 10000 };
  const proAi = { cur: 12, max: 200 };
  const pro2Exp = { cur: 7800, max: 10000 };
  const validDate = '2026-04-12';
  const daysLeft = 22;

  const planSubKey =
    tier === 'pro' ? 'benefitsPage.planSubPro' : tier === 'lite' ? 'benefitsPage.planSubLite' : 'benefitsPage.planSubFree';

  const freeUnlocked = useMemo(
    () => [
      { icon: '/point/first_login.svg', label: t('vip.benefit.basicChart') },
      { icon: '/icons/new_detail/community.svg', label: t('vip.benefit.basicPush') },
      { icon: '/point/new_coin.svg', label: t('benefitsPage.emailAlerts') },
    ],
    [t]
  );

  const lockedGrid = useMemo(
    () => [
      {
        title: t('vipRecharge.features.bigOrder'),
        subtitle: t('benefitsPage.depth40'),
        tone: 'peach',
        icon: '/icons/new_detail/bell.svg',
      },
      {
        title: t('vipRecharge.features.monthlyPoints'),
        subtitle: t('benefitsPage.monthlyPointsRange'),
        tone: 'lavender',
        icon: '/point/new_coin.svg',
      },
      {
        title: t('benefitsPage.aiCall'),
        subtitle: t('benefitsPage.aiCallRange'),
        tone: 'sky',
        icon: '/icons/new_detail/ai.svg',
      },
      {
        title: t('vip.benefit.ogBadge'),
        subtitle: '',
        tone: 'sand',
        icon: '/icons/new_detail/vip.svg',
      },
    ],
    [t]
  );

  const lockedProRows = useMemo(
    () => [
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.alphaGroup') },
      { icon: '/icons/new_detail/vip.svg', label: t('benefitsPage.exclusiveService') },
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.noAds') },
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.multiTheme') },
    ],
    [t]
  );

  const liteIconGrid = useMemo(
    () => [
      { icon: '/point/first_login.svg', label: t('vip.benefit.basicChart') },
      { icon: '/icons/new_detail/community.svg', label: t('vip.benefit.basicPush') },
      { icon: '/point/new_coin.svg', label: t('benefitsPage.emailAlerts') },
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.multiTheme') },
      { icon: '/icons/new_detail/vip.svg', label: t('benefitsPage.standardCS') },
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.noAds') },
      { icon: '/icons/new_detail/vip.svg', label: t('benefitsPage.identityTag') },
    ],
    [t]
  );

  const proIconGrid = useMemo(
    () => [
      { icon: '/point/first_login.svg', label: t('vip.benefit.basicChart') },
      { icon: '/icons/new_detail/community.svg', label: t('vip.benefit.basicPush') },
      { icon: '/point/new_coin.svg', label: t('benefitsPage.emailAlerts') },
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.multiTheme') },
      { icon: '/icons/new_detail/vip.svg', label: t('benefitsPage.exclusiveService') },
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.noAds') },
      { icon: '/icons/new_detail/vip.svg', label: t('benefitsPage.identityTag') },
      { icon: '/icons/new_detail/vip.svg', label: t('vip.benefit.alphaGroup') },
    ],
    [t]
  );

  const goRecharge = () => router.push('/vip-recharge');

  const navBg = tier === 'pro' ? 'transparent' : '#fff';
  const navColor = tier === 'pro' ? 'rgba(252, 230, 196, 0.92)' : undefined;

  return (
    <div className={`${styles.container} ${styles[`mode_${tier}`]}`}>
      <NavBar
        title={t('benefitsPage.title')}
        backgroundColor={navBg}
        showBorder={false}
        color={navColor}
      />

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.heroSub}>{t('benefitsPage.heroSub')}</div>
            <div className={styles.heroDays}>
              <span className={styles.daysNum}>{days}</span>
              <span className={styles.daysUnit}>{t('benefitsPage.daysUnit')}</span>
            </div>
          </div>
          <img className={styles.heroMascot} src="/point/point_bg.png" alt="" />
        </div>

        <div className={styles.tierRail} role="tablist" aria-label={t('benefitsPage.title')}>
          <div className={styles.tierRailLine} />
          {TIERS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tier === k}
              className={`${styles.tierStop} ${tier === k ? styles.tierStopActive : ''} ${styles[`tierStop_${k}`]}`}
              onClick={() => setTier(k)}
            >
              <span className={styles.tierDot} />
              <span className={styles.tierStopLabel}>{getTierLabel(k)}</span>
            </button>
          ))}
        </div>

        {tier === 'free' && (
          <div className={`${styles.planCard} ${styles.planCardFree}`}>
            <div className={styles.planMain}>
              <div className={styles.planTitle}>{getTierLabel(tier)}</div>
              <div className={styles.planSub}>{t(planSubKey)}</div>
              <div className={styles.freeHighlight}>
                <span className={styles.freeShield} aria-hidden />
                <div>
                  <div className={styles.freeHighlightStrong}>120x</div>
                  <div className={styles.freeHighlightSub}>{t('benefitsPage.aiCallPerMonth')}</div>
                </div>
              </div>
              <div className={styles.planHint}>{t('benefitsPage.upgradeToEnjoy')}</div>
            </div>
            <button className={styles.planCta} type="button" onClick={goRecharge}>
              {t('benefitsPage.upgradeLitePro')}
            </button>
          </div>
        )}

        {tier === 'lite' && (
          <div className={`${styles.planCard} ${styles.planCardLite}`}>
            <div className={styles.litePlanTop}>
              <div>
                <div className={styles.planTitle}>{getTierLabel(tier)}</div>
                <div className={styles.planSub}>{t(planSubKey)}</div>
              </div>
              <span className={styles.liteHexBadge} aria-hidden>
                <span>V</span>
              </span>
            </div>
            <div className={styles.litePointsBlock}>
              <div className={styles.litePointsLabel}>{t('benefitsPage.pointsThisMonth')}</div>
              <div className={styles.litePointsNums}>
                {litePoints.cur.toLocaleString()} / {litePoints.max.toLocaleString()}
              </div>
              <ProgressLine current={litePoints.cur} max={litePoints.max} variant="emerald" />
            </div>
            <div className={styles.liteValidity}>
              <span>{t('benefitsPage.validUntil', { tier: 'Lite', date: validDate })}</span>
              <span className={styles.liteValidityTag}>{t('benefitsPage.daysLeftTag', { n: daysLeft })}</span>
            </div>
          </div>
        )}

        {tier === 'pro' && (
          <div className={`${styles.planCard} ${styles.planCardPro}`}>
            <div className={styles.proPlanHead}>
              <div>
                <div className={styles.proLevelTitle}>{t('benefitsPage.proLevel', { n: 1 })}</div>
                <div className={styles.planSubPro}>{t(planSubKey)}</div>
              </div>
              <span className={styles.proHexBadge} aria-hidden>
                <span>V1</span>
              </span>
            </div>
            <div className={styles.proPointsBlock}>
              <div className={styles.litePointsLabel}>{t('benefitsPage.pointsThisMonth')}</div>
              <div className={styles.litePointsNums}>
                {proPoints.cur.toLocaleString()} / {proPoints.max.toLocaleString()}
              </div>
              <ProgressLine current={proPoints.cur} max={proPoints.max} variant="amber" />
            </div>
            <div className={styles.liteValidity}>
              <span>{t('benefitsPage.validUntil', { tier: 'Pro', date: validDate })}</span>
              <span className={styles.proValidityTag}>{t('benefitsPage.daysLeftTag', { n: daysLeft })}</span>
            </div>
            <div className={styles.proNextTier}>
              <div className={styles.proNextTierTitle}>{t('benefitsPage.nextLevelCardTitle')}</div>
              <div className={styles.proNextTierSub}>
                {t('benefitsPage.nextLevelProgress', { current: pro2Exp.cur.toLocaleString(), max: pro2Exp.max.toLocaleString() })}
              </div>
              <ProgressLine current={pro2Exp.cur} max={pro2Exp.max} variant="amberDeep" />
              <div className={styles.proNextRewards}>{t('benefitsPage.nextLevelRewards', { points: '120,000', ai: 60 })}</div>
              <button type="button" className={styles.proQuickUp} onClick={goRecharge}>
                {t('benefitsPage.quickUpgrade')}
              </button>
            </div>
          </div>
        )}

        {tier === 'free' && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>{t('benefitsPage.tierBenefits', { tier: getTierLabel(tier) })}</div>
              <div className={styles.benefitList}>
                {freeUnlocked.map((x, idx) => (
                  <div key={idx} className={styles.benefitItem}>
                    <img className={styles.benefitIcon} src={x.icon} alt="" />
                    <div className={styles.benefitLabel}>{x.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>{t('benefitsPage.lockedSection')}</div>
              <div className={styles.lockedGrid}>
                {lockedGrid.map((x, idx) => (
                  <div key={idx} className={`${styles.lockedCard} ${styles[`tone_${x.tone}`]}`}>
                    <div className={styles.lockedCardTop}>
                      <img className={styles.lockedIcon} src={x.icon} alt="" />
                      <div className={styles.lockedTitle}>{x.title}</div>
                    </div>
                    {!!x.subtitle && <div className={styles.lockedSub}>{x.subtitle}</div>}
                  </div>
                ))}
              </div>
              <div className={styles.lockedList}>
                {lockedProRows.map((x, idx) => (
                  <div key={idx} className={styles.lockedRow}>
                    <div className={styles.lockedRowLeft}>
                      <span className={styles.lockedRowIcon} />
                      <span className={styles.lockedRowLabel}>{x.label}</span>
                    </div>
                    <button className={styles.upgradePill} type="button" onClick={goRecharge}>
                      {t('benefitsPage.upgradePro')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tier === 'lite' && (
          <div className={`${styles.section} ${styles.sectionLite}`}>
            <div className={styles.sectionTitleLite}>{t('benefitsPage.exclusiveMemberLine', { name: 'Lite' })}</div>

            <div className={styles.liteFeatureStack}>
              <div className={`${styles.liteFeatCard} ${styles.liteFeatPurple}`}>
                <div className={styles.liteFeatHead}>
                  <span>{t('vipRecharge.features.monthlyPoints')}</span>
                  <span className={styles.liteFeatNums}>
                    {litePoints.cur.toLocaleString()}/{litePoints.max.toLocaleString()}
                  </span>
                </div>
                <ProgressLine current={litePoints.cur} max={litePoints.max} variant="violet" />
              </div>
              <div className={`${styles.liteFeatCard} ${styles.liteFeatBlue}`}>
                <div className={styles.liteFeatHead}>
                  <span>{t('benefitsPage.aiCall')}</span>
                  <span className={styles.liteFeatNums}>
                    {liteAi.cur}/{liteAi.max}
                  </span>
                </div>
                <ProgressLine current={liteAi.cur} max={liteAi.max} variant="cyan" />
              </div>
              <div className={`${styles.liteFeatCard} ${styles.liteFeatPeach}`}>
                <div className={styles.liteFeatHead}>
                  <span>{t('benefitsPage.bigOrderTitle')}</span>
                </div>
                <div className={styles.liteFeatStatic}>{t('benefitsPage.depth20')}</div>
              </div>
            </div>

            <div className={styles.iconGrid}>
              {liteIconGrid.map((x, idx) => (
                <div key={idx} className={styles.iconGridItem}>
                  <div className={styles.iconGridCircle}>
                    <img src={x.icon} alt="" />
                  </div>
                  <div className={styles.iconGridLabel}>{x.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.sectionTitleLite} style={{ marginTop: 14 }}>
              {t('benefitsPage.lockedSection')}
            </div>
            <div className={styles.lockedList}>
              {lockedProRows.map((x, idx) => (
                <div key={idx} className={styles.lockedRow}>
                  <div className={styles.lockedRowLeft}>
                    <span className={styles.lockedRowIcon} />
                    <span className={styles.lockedRowLabel}>{x.label}</span>
                  </div>
                  <button className={styles.upgradePill} type="button" onClick={goRecharge}>
                    {t('benefitsPage.upgradePro')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tier === 'pro' && (
          <div className={`${styles.section} ${styles.sectionPro}`}>
            <div className={styles.sectionTitlePro}>{t('benefitsPage.exclusiveMemberLine', { name: t('benefitsPage.proLevel', { n: 1 }) })}</div>

            <div className={styles.liteFeatureStack}>
              <div className={styles.proFeatWhite}>
                <div className={styles.liteFeatHead}>
                  <span>{t('vipRecharge.features.monthlyPoints')}</span>
                  <span className={styles.proFeatNums}>
                    {proPoints.cur.toLocaleString()}/{proPoints.max.toLocaleString()}
                  </span>
                </div>
                <ProgressLine current={proPoints.cur} max={proPoints.max} variant="violet" />
              </div>
              <div className={styles.proFeatWhite}>
                <div className={styles.liteFeatHead}>
                  <span>{t('benefitsPage.aiCall')}</span>
                  <span className={styles.proFeatNums}>
                    {proAi.cur}/{proAi.max}
                  </span>
                </div>
                <ProgressLine current={proAi.cur} max={proAi.max} variant="cyan" />
              </div>
            </div>

            <div className={styles.proCardRow}>
              <div className={styles.proInfoCard}>
                <div className={styles.proInfoTitle}>{t('benefitsPage.bigOrderTitle')}</div>
                <div className={styles.proInfoSub}>{t('benefitsPage.depth40')}</div>
              </div>
              <div className={`${styles.proInfoCard} ${styles.proInfoCardBrown}`}>
                <div className={styles.proInfoTitle}>{t('benefitsPage.allowanceCardTitle')}</div>
                <div className={styles.proInfoSub}>{t('benefitsPage.allowanceCardBody', { points: '10,000', ai: 40 })}</div>
                <button type="button" className={styles.proSmallBtn} onClick={goRecharge}>
                  {t('benefitsPage.upgradeMore')}
                </button>
              </div>
            </div>

            <div className={`${styles.proAlphaCard}`}>
              <div className={styles.proAlphaLeft}>
                <span className={styles.proAlphaIcon} />
                <span className={styles.proAlphaText}>{t('vip.benefit.alphaGroup')}</span>
              </div>
              <button type="button" className={styles.proEnterBtn} onClick={goRecharge}>
                {t('benefitsPage.enterAlpha')}
              </button>
            </div>

            <div className={styles.iconGridPro}>
              {proIconGrid.map((x, idx) => (
                <div key={idx} className={styles.iconGridItem}>
                  <div className={styles.iconGridCirclePro}>
                    <img src={x.icon} alt="" />
                  </div>
                  <div className={styles.iconGridLabelPro}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
