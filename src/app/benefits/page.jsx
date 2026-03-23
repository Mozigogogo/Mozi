'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import styles from './page.module.less';
import PlanCardFree from '@/components/PlanCardFree';
import ProgressLine from '@/components/ProgressLine';
import PlanCardLite from '@/components/PlanCardLite';

export default function BenefitsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  // 临时切换展示模式（Free / Lite / Pro）
  const tier = 'free';
  const tierLabel = tier === 'lite' ? 'Lite' : tier === 'pro' ? 'Pro' : 'Free';
  const containerModeClass = tier === 'lite' ? styles.mode_lite : tier === 'pro' ? styles.mode_pro : '';

  const days = 259;
  const litePoints = { cur: 4518, max: 5000 };
  const liteAi = { cur: 12, max: 40 };
  const liteDepth = { cur: 20, max: 40 };
  const liteValidUntil = '2026-04-12';
  const liteDaysLeft = 22;
  const proPoints = { cur: 9518, max: 10000 };
  const proAi = { cur: 12, max: 200 };

  const planSubKey = tier === 'lite' ? 'benefitsPage.planSubLite' : 'benefitsPage.planSubFree';

  const freeUnlocked = useMemo(
    () => [
      { icon: '/benefits/market.svg', label: t('vip.benefit.basicChart') },
      { icon: '/benefits/push.svg', label: t('vip.benefit.basicPush') },
      { icon: '/benefits/email_alert.svg', label: t('benefitsPage.emailAlerts') },
    ],
    [t]
  );

  const liteUnlocked = useMemo(
    () => [
      {
        tone: 'chart',
        icon: '/benefits/monthly_points.svg',
        title: t('benefitsPage.monthlyPoints'),
        value: `${litePoints.cur.toLocaleString()}/${litePoints.max.toLocaleString()}`,
        percent: (litePoints.cur / litePoints.max) * 100
      },
      {
        tone: 'ai',
        icon: '/benefits/ai_call.svg',
        title: t('benefitsPage.aiCall'),
        value: `${liteAi.cur}/${liteAi.max}`,
        percent: (liteAi.cur / liteAi.max) * 100
      },
      {
        tone: 'deal',
        icon: '/benefits/big_deal.svg',
        title: t('vipRecharge.features.bigOrder'),
        value: t('benefitsPage.depth20'),
        percent: (liteDepth.cur / liteDepth.max) * 100
      }
    ],
    [t, litePoints.cur, litePoints.max, liteAi.cur, liteAi.max, liteDepth.cur, liteDepth.max]
  );

  const lockedGrid = useMemo(
    () => [
      {
        title: t('vipRecharge.features.bigOrder'),
        subtitle: t('benefitsPage.depth40'),
        tone: 'peach',
        icon: '/benefits/big_deal.svg',
      },
      {
        title: t('vipRecharge.features.monthlyPoints'),
        subtitle: t('benefitsPage.monthlyPointsRange'),
        tone: 'lavender',
        icon: '/benefits/monthly_points.svg',
      },
      {
        title: t('benefitsPage.aiCall'),
        subtitle: t('benefitsPage.aiCallRange'),
        tone: 'sky',
        icon: '/benefits/ai_call.svg',
      },
      {
        title: t('vip.benefit.ogBadge'),
        subtitle: '',
        tone: 'sand',
        icon: '/benefits/gold_vip.svg',
      },
    ],
    [t]
  );

  const lockedProRows = useMemo(
    () => [
      { icon: '/benefits/group.svg', label: t('vip.benefit.alphaGroup') },
      { icon: '/benefits/helper.svg', label: t('benefitsPage.exclusiveService') },
      { icon: '/benefits/no_advertise.svg', label: t('vip.benefit.noAds') },
      { icon: '/benefits/multi_skin.svg', label: t('vip.benefit.multiTheme') },
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

  const liteQuickIcons = useMemo(
    () => [
      { icon: '/point/Basic_market .svg', label: t('vip.benefit.basicChart') },
      { icon: '/point/Information_push.svg', label: '基础推送' },
      { icon: '/point/Email_alert.svg', label: t('benefitsPage.emailAlerts') },
      { icon: '/point/Topic_witching.svg', label: '主题切换' },
      { icon: '/point/Customer_service.svg', label: t('benefitsPage.standardCS') },
      { icon: '/point/No_advertisement.svg', label: '无广告' },
      { icon: '/point/Exclusive_logo.svg', label: t('benefitsPage.identityTag') },
    ],
    [t]
  );

  const goRecharge = () => router.push('/vip-recharge');

  const navBg = tier === 'pro' ? 'transparent' : '#fff';
  const navColor = tier === 'pro' ? 'rgba(252, 230, 196, 0.92)' : undefined;

  return (
    <div className={`${styles.container} ${containerModeClass}`}>
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
        </div>

        {(tier === 'free' || tier === 'lite') && (
          <div className={styles.freeGlassWrap}>
            {tier === 'lite' ? (
              <PlanCardLite
                title={tierLabel}
                subtitle={t(planSubKey)}
                pointsCur={litePoints.cur}
                pointsMax={litePoints.max}
                validUntil={liteValidUntil}
                daysLeft={liteDaysLeft}
                activeTier={tier}
              />
            ) : (
              <PlanCardFree
                title={tierLabel}
                subtitle={t(planSubKey)}
                highlightSub={t('benefitsPage.aiCallPerMonth')}
                hint={t('benefitsPage.upgradeToEnjoy')}
                ctaText={t('benefitsPage.upgradeLitePro')}
                onCtaClick={goRecharge}
                activeTier={tier}
              />
            )}

            <div className={styles.sectionsBigBox}>
              <div className={styles.section}>
                {tier === 'lite' ? (
                  <div className={styles.sectionTitleLite}>
                    <img
                      className={styles.sectionTitleLiteIcon}
                      src="/benefits/flag.svg"
                      alt=""
                      aria-hidden="true"
                    />
                    Lite会员专属权益
                  </div>
                ) : (
                  <div className={styles.sectionTitle}>{t('benefitsPage.tierBenefits', { tier: tierLabel })}</div>
                )}
                <div className={styles.benefitList}>
                  {tier === 'lite'
                    ? liteUnlocked.map((x, idx) => (
                        <div
                          key={idx}
                          className={`${styles.benefitItem} ${x.tone === 'deal' ? styles.benefitItemDeal : ''}`}
                        >
                          <div className={styles.benefitLiteTopRow}>
                            <div className={styles.benefitLiteTopLeft}>
                              <img className={styles.benefitIcon} src={x.icon} alt="" />
                              <div className={styles.benefitLabelLite}>{x.title}</div>
                            </div>
                            <div className={`${styles.benefitValueLite} ${styles[`benefitValueLite_${x.tone}`]}`}>{x.value}</div>
                          </div>

                          {x.tone !== 'deal' && (
                            <div className={styles.benefitProgressTrackLite} aria-hidden>
                              <div
                                className={`${styles.benefitProgressFillLite} ${styles[`benefitProgressFillLite_${x.tone}`]}`}
                                style={{ width: `${Math.max(0, Math.min(100, x.percent))}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))
                    : freeUnlocked.map((x, idx) => (
                        <div key={idx} className={styles.benefitItem}>
                          <img className={styles.benefitIcon} src={x.icon} alt="" />
                          <div className={styles.benefitLabel}>{x.label}</div>
                        </div>
                      ))}
                </div>

                {tier === 'lite' && (
                  <div className={styles.liteQuickIconGrid} aria-hidden="true">
                    {liteQuickIcons.map((x, idx) => (
                      <div key={idx} className={styles.liteQuickIconItem}>
                        <div className={styles.liteQuickIconCircle}>
                          <img src={x.icon} alt="" />
                        </div>
                        <div className={styles.liteQuickIconLabel}>{x.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>{t('benefitsPage.lockedSection')}</div>
                {tier !== 'lite' && (
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
                )}
                <div className={styles.lockedList}>
                  {lockedProRows
                    .filter(
                      (x) =>
                        !(
                          tier === 'lite' &&
                          (x.icon === '/benefits/no_advertise.svg' ||
                            x.icon === '/benefits/multi_skin.svg')
                        )
                    )
                    .map((x, idx) => (
                    <div key={idx} className={styles.lockedRow}>
                      <div className={styles.lockedRowLeft}>
                        <img
                          className={styles.lockedRowIconImg}
                          src={x.icon}
                          alt=""
                          aria-hidden="true"
                        />
                        <span className={styles.lockedRowLabel}>{x.label}</span>
                      </div>
                      <button className={styles.upgradePill} type="button" onClick={goRecharge}>
                        {t('benefitsPage.upgradePro')}
                      </button>
                    </div>
                  ))}
                  {tier === 'lite' && (
                    <div key="lite-identity-tag" className={styles.lockedRow}>
                      <div className={styles.lockedRowLeft}>
                        <img
                          className={styles.lockedRowIconImg}
                          src="/benefits/high_flag.svg"
                          alt=""
                          aria-hidden="true"
                        />
                        <span className={styles.lockedRowLabel}>高级标识</span>
                      </div>
                      <button className={styles.upgradePill} type="button" onClick={goRecharge}>
                        {t('benefitsPage.upgradePro')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
                <ProgressLine activeTier="pro" />
              </div>
              <div className={styles.proFeatWhite}>
                <div className={styles.liteFeatHead}>
                  <span>{t('benefitsPage.aiCall')}</span>
                  <span className={styles.proFeatNums}>
                    {proAi.cur}/{proAi.max}
                  </span>
                </div>
                <ProgressLine activeTier="pro" />
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
