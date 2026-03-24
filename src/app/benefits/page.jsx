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
  const { t, i18n } = useTranslation();
  const isEnglish = (i18n.language || '').startsWith('en');
  // 临时切换展示模式（Free / Lite / Pro）
  const tier = 'free';
  const tierLabel = tier === 'lite' ? 'Lite' : tier === 'pro' ? 'Pro-1' : 'Free';
  const containerModeClass = tier === 'lite' ? styles.mode_lite : tier === 'pro' ? styles.mode_pro : '';

  const days = 259;
  const litePoints = { cur: 4518, max: 5000 };
  const liteAi = { cur: 12, max: 40 };
  const liteDepth = { cur: 20, max: 40 };
  const liteValidUntil = '2026-04-12';
  const liteDaysLeft = 22;
  const proValidUntil = '2026-04-12';
  const proDaysLeft = 22;
  const proPoints = { cur: 9518, max: 10000 };
  const proAi = { cur: 12, max: 200 };

  const planSubKey =
    tier === 'lite' ? 'benefitsPage.planSubLite' : tier === 'pro' ? 'benefitsPage.planSubPro' : 'benefitsPage.planSubFree';

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

  const proUnlocked = useMemo(
    () => [
      {
        tone: 'chart',
        icon: '/benefits/monthly_points.svg',
        title: t('benefitsPage.monthlyPoints'),
        value: `${proPoints.cur.toLocaleString()}/${proPoints.max.toLocaleString()}`,
        percent: (proPoints.cur / proPoints.max) * 100
      },
      {
        tone: 'ai',
        icon: '/benefits/ai_call.svg',
        title: t('benefitsPage.aiCall'),
        value: `${proAi.cur}/${proAi.max}`,
        percent: (proAi.cur / proAi.max) * 100
      },
      {
        tone: 'deal',
        icon: '/benefits/big_deal.svg',
        title: t('vipRecharge.features.bigOrder'),
        value: t('benefitsPage.depth40'),
        percent: 100
      }
    ],
    [t, proPoints.cur, proPoints.max, proAi.cur, proAi.max]
  );

  // 使用与 lite 相同的“进度卡片”布局：Pro/ Lite 都复用这套结构
  const progressUnlocked = tier === 'pro' ? proUnlocked : liteUnlocked;

  const lockedGrid = useMemo(
    () => [
      {
        title: t('vipRecharge.features.bigOrder'),
        subtitle: t('benefitsPage.depth40'),
        tone: 'peach',
        icon: '/benefits/big_deal.svg',
      },
      {
        title: 'Points',
        subtitle: '10k/mo',
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

  // Pro 模式：隐藏“专属客服 / 纯净无广告沉浸式 / 多主题自由切换”
  //（只保留“专属Alpha核心群组”这一行，匹配设计稿红框消失的效果）
  const hiddenInProIcons = useMemo(() => {
    return ['/benefits/helper.svg', '/benefits/no_advertise.svg', '/benefits/multi_skin.svg'];
  }, []);

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
      { icon: '/point/Information_push.svg', label: t('vip.benefit.basicPush') },
      { icon: '/point/Email_alert.svg', label: t('benefitsPage.emailAlerts') },
      { icon: '/point/Topic_witching.svg', label: t('vip.benefit.multiTheme') },
      { icon: '/point/Customer_service.svg', label: t('benefitsPage.supportShort') },
      { icon: '/point/No_advertisement.svg', label: t('vip.benefit.noAds') },
      { icon: '/point/Exclusive_logo.svg', label: t('benefitsPage.identityTag') },
    ],
    [t]
  );

  const proQuickIcons = useMemo(
    () => [
      { icon: '/benefits/market_gold.svg', label: t('vip.benefit.basicChart') },
      { icon: '/benefits/push_gold.svg', label: t('vip.benefit.basicPush') },
      { icon: '/benefits/email_gold.svg', label: t('benefitsPage.emailAlerts') },
      { icon: '/benefits/multi_skin.svg', label: t('vip.benefit.multiTheme') },
      { icon: '/benefits/helper.svg', label: t('benefitsPage.supportShort') },
      { icon: '/benefits/no_advertise.svg', label: t('vip.benefit.noAds') },
      { icon: '/benefits/high_flag.svg', label: t('benefitsPage.identityTag') },
      { icon: '/benefits/group.svg', label: t('vip.benefit.alphaGroup') },
    ],
    [t]
  );

  const quickIcons = tier === 'pro' ? proQuickIcons : liteQuickIcons;

  const quickIconGridNode = (
    <div className={styles.liteQuickIconGrid} aria-hidden="true">
      {quickIcons.map((x, idx) => (
        <div key={idx} className={styles.liteQuickIconItem}>
          <div className={`${styles.liteQuickIconCircle} ${tier === 'pro' ? styles.proQuickIconCircle : ''}`}>
            <img className={tier === 'pro' ? styles.proQuickIconImg : ''} src={x.icon} alt="" />
          </div>
          <div
            className={`${tier === 'pro' ? styles.proQuickIconLabel : styles.liteQuickIconLabel} ${
              isEnglish ? styles.quickIconLabelEn : ''
            }`}
          >
            {x.label}
          </div>
        </div>
      ))}
    </div>
  );

  const goRecharge = () => router.push('/vip-recharge');

  // NavBar 需要白色底，否则“pro”模式下会传入 transparent 导致背景不符合设计
  const navBg = '#ffffff';
  const navColor = undefined;

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
            <div className={styles.heroSub}>With Mozi for</div>
            <div className={styles.heroDays}>
              <span className={styles.daysNum}>{days}</span>
              <span className={styles.daysUnit}>{t('benefitsPage.daysUnit')}</span>
            </div>
          </div>
        </div>

        {(tier === 'free' || tier === 'lite' || tier === 'pro') && (
          <div className={styles.freeGlassWrap}>
            {tier === 'lite' || tier === 'pro' ? (
              <PlanCardLite
                title={tierLabel}
                subtitle={t(planSubKey)}
                pointsCur={tier === 'lite' ? litePoints.cur : proPoints.cur}
                pointsMax={tier === 'lite' ? litePoints.max : proPoints.max}
                validUntil={tier === 'lite' ? liteValidUntil : tier === 'pro' ? proValidUntil : undefined}
                daysLeft={tier === 'lite' ? liteDaysLeft : tier === 'pro' ? proDaysLeft : undefined}
                activeTier={tier}
                onPro2Upgrade={tier === 'pro' ? goRecharge : undefined}
              />
            ) : (
              <PlanCardFree
                title={tierLabel}
                subtitle={t(planSubKey)}
                highlightSub={t('benefitsPage.aiCallPerMonth')}
                hint="Unlock more"
                ctaText="Upgrade"
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
                    {t('benefitsPage.exclusiveMemberLine', { name: 'Lite' })}
                  </div>
                ) : tier === 'pro' ? (
                  <div className={styles.sectionTitle}>
                    <img className={styles.sectionTitleProIcon} src="/benefits/vip_pro.svg" alt="" aria-hidden="true" />
                    {t('benefitsPage.exclusiveMemberLine', { name: 'Pro1' })}
                  </div>
                ) : (
                  <div className={styles.sectionTitle}>Free权益</div>
                )}
                <div className={styles.benefitList}>
                  {tier === 'lite' || tier === 'pro'
                    ? progressUnlocked.map((x, idx) => (
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

                {tier === 'lite' && quickIconGridNode}
              </div>

              <div className={styles.section}>
                {tier !== 'pro' && <div className={styles.sectionTitle}>{t('benefitsPage.lockedSection')}</div>}
                {tier !== 'lite' && tier !== 'pro' && (
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
                {tier === 'pro' && (
                  <div className={styles.proAllowanceTopCard}>
                    <div className={styles.proAllowanceTopLeft}>
                      <div className={styles.proAllowanceTopMain}>
                        {t('benefitsPage.allowancePointsMonthly', { points: proPoints.max.toLocaleString() })}
                      </div>
                      <div className={styles.proAllowanceTopSub}>
                        {t('benefitsPage.allowanceAiMonthly', { ai: liteAi.max })}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.upgradePill} ${styles.upgradePillWide}`}
                      onClick={goRecharge}
                    >
                      {t('benefitsPage.upgrade')}
                    </button>
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
                        ) &&
                        !(tier === 'pro' && hiddenInProIcons.includes(x.icon))
                    )
                    .map((x, idx) => (
                    <div
                      key={idx}
                      className={`${styles.lockedRow} ${tier === 'pro' ? styles.lockedRowPro : ''}`}
                    >
                      <div className={styles.lockedRowLeft}>
                        <img
                          className={styles.lockedRowIconImg}
                          src={x.icon}
                          alt=""
                          aria-hidden="true"
                        />
                        <span className={styles.lockedRowLabel}>{x.label}</span>
                      </div>
                      <button
                        className={styles.upgradePill}
                        type="button"
                        onClick={goRecharge}
                      >
                        {tier === 'pro' && x.icon === '/benefits/group.svg'
                          ? t('benefitsPage.enterAlpha')
                          : t('benefitsPage.upgrade')}
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
                        <span className={styles.lockedRowLabel}>{t('benefitsPage.identityTag')}</span>
                      </div>
                      <button className={styles.upgradePill} type="button" onClick={goRecharge}>
                        {t('benefitsPage.upgrade')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {tier === 'pro' && quickIconGridNode}
            </div>
          </div>
        )}

        {tier === 'pro' && false && (
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
