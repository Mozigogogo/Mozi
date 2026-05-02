'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import NavBar from '@/components/NavBar';
import styles from './page.module.less';
import PlanCardFree from '@/components/PlanCardFree';
import ProgressLine from '@/components/ProgressLine';
import PlanCardLite from '@/components/PlanCardLite';

const MY_SUBSCRIPTION_PLAN_CODE_KEY = 'mozi_my_subscription_plan_code_v1';

const planCodeToTier = (planCode) => {
  const raw = String(planCode || '').trim();
  if (!raw) return 'free';
  const up = raw.toUpperCase();
  if (up === 'FREE' || up === '0' || up === 'NONE') return 'free';
  if (up.includes('PRO')) return 'pro';
  if (up.includes('LITE')) return 'lite';
  // 兜底：只要不是 free，就按 pro/lite 以外归为 lite 更保守（也可按业务改为 pro）
  return 'lite';
};

export function BenefitsPageContent({ showNavBar = true, className = '', isPc = false } = {}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEnglish = (i18n.language || '').startsWith('en');
  const ALPHA_CORE_GROUP_URL = 'https://t.me/+vWtmYRx42d8yMWFl';
  // 临时切换展示模式（Free / Lite / Pro）
  const [tier, setTier] = useState('free');
  const tierLabel = tier === 'lite' ? 'Lite' : tier === 'pro' ? 'Pro-1' : 'Free';
  const containerModeClass = tier === 'lite' ? styles.mode_lite : tier === 'pro' ? styles.mode_pro : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readAndSetTier = (planCode) => {
      setTier(planCodeToTier(planCode));
    };

    // 1) 初次进入：读取本地缓存
    try {
      const saved = localStorage.getItem(MY_SUBSCRIPTION_PLAN_CODE_KEY);
      readAndSetTier(saved);
    } catch (_) {}

    // 2) 同 Tab 内：接口调用后会触发自定义事件
    const onPlanCodeUpdated = (e) => {
      const nextPlanCode = e?.detail?.planCode;
      readAndSetTier(nextPlanCode);
    };
    window.addEventListener('mozi:subscriptionPlanCodeUpdated', onPlanCodeUpdated);

    // 3) 跨 Tab：监听 storage
    const onStorage = (e) => {
      if (e?.key !== MY_SUBSCRIPTION_PLAN_CODE_KEY) return;
      readAndSetTier(e?.newValue);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('mozi:subscriptionPlanCodeUpdated', onPlanCodeUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/market.svg', label: t('vip.benefit.basicChart') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/push.svg', label: t('vip.benefit.basicPush') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/email_alert.svg', label: t('benefitsPage.emailAlerts') },
    ],
    [t]
  );

  const liteUnlocked = useMemo(
    () => [
      {
        tone: 'chart',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/monthly_points.svg',
        title: t('benefitsPage.monthlyPoints'),
        value: `${litePoints.cur.toLocaleString()}/${litePoints.max.toLocaleString()}`,
        percent: (litePoints.cur / litePoints.max) * 100
      },
      {
        tone: 'ai',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/ai_call.svg',
        title: t('benefitsPage.aiCall'),
        value: `${liteAi.cur}/${liteAi.max}`,
        percent: (liteAi.cur / liteAi.max) * 100
      },
      {
        tone: 'deal',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/big_deal.svg',
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
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/monthly_points.svg',
        title: t('benefitsPage.monthlyPoints'),
        value: `${proPoints.cur.toLocaleString()}/${proPoints.max.toLocaleString()}`,
        percent: (proPoints.cur / proPoints.max) * 100
      },
      {
        tone: 'ai',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/ai_call.svg',
        title: t('benefitsPage.aiCall'),
        value: `${proAi.cur}/${proAi.max}`,
        percent: (proAi.cur / proAi.max) * 100
      },
      {
        tone: 'deal',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/big_deal.svg',
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
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/big_deal.svg',
      },
      {
        title: 'Points',
        subtitle: '10k/mo',
        tone: 'lavender',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/monthly_points.svg',
      },
      {
        title: t('benefitsPage.aiCall'),
        subtitle: t('benefitsPage.aiCallRange'),
        tone: 'sky',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/ai_call.svg',
      },
      {
        title: t('vip.benefit.ogBadge'),
        subtitle: '',
        tone: 'sand',
        icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/gold_vip.svg',
      },
    ],
    [t]
  );

  const lockedProRows = useMemo(
    () => [
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/group.svg', label: t('vip.benefit.alphaGroup') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/helper.svg', label: t('benefitsPage.exclusiveService') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/no_advertise.svg', label: t('vip.benefit.noAds') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/multi_skin.svg', label: t('vip.benefit.multiTheme') },
    ],
    [t]
  );

  // Pro 模式：隐藏“专属客服 / 纯净无广告沉浸式 / 多主题自由切换”
  //（只保留“专属Alpha核心群组”这一行，匹配设计稿红框消失的效果）
  const hiddenInProIcons = useMemo(() => {
    return ['https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/helper.svg', 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/no_advertise.svg', 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/multi_skin.svg'];
  }, []);

  const proIconGrid = useMemo(
    () => [
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/first_login.svg', label: t('vip.benefit.basicChart') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/community.svg', label: t('vip.benefit.basicPush') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/new_coin.svg', label: t('benefitsPage.emailAlerts') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/vip.svg', label: t('vip.benefit.multiTheme') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/vip.svg', label: t('benefitsPage.exclusiveService') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/vip.svg', label: t('vip.benefit.noAds') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/vip.svg', label: t('benefitsPage.identityTag') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/vip.svg', label: t('vip.benefit.alphaGroup') },
    ],
    [t]
  );

  const liteQuickIcons = useMemo(() => {
    if (isPc) {
      return [
        { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/market.svg', label: t('vip.benefit.basicChart') },
        { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/push.svg', label: t('vip.benefit.basicPush') },
        { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/email_alert.svg', label: t('benefitsPage.emailAlerts') },
        { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/multi_skin.svg', label: t('vip.benefit.multiTheme') },
        { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/helper.svg', label: t('benefitsPage.supportShort') },
        { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/no_advertise.svg', label: t('vip.benefit.noAds') },
        { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/high_flag.svg', label: t('benefitsPage.identityTag') },
      ];
    }
    return [
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/Basic_market .svg', label: t('vip.benefit.basicChart') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/Information_push.svg', label: t('vip.benefit.basicPush') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/Email_alert.svg', label: t('benefitsPage.emailAlerts') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/Topic_witching.svg', label: t('vip.benefit.multiTheme') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/Customer_service.svg', label: t('benefitsPage.supportShort') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/No_advertisement.svg', label: t('vip.benefit.noAds') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/point/Exclusive_logo.svg', label: t('benefitsPage.identityTag') },
    ];
  }, [isPc, t]);

  const proQuickIcons = useMemo(
    () => [
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/market_gold.svg', label: t('vip.benefit.basicChart') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/push_gold.svg', label: t('vip.benefit.basicPush') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/email_gold.svg', label: t('benefitsPage.emailAlerts') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/multi_skin.svg', label: t('vip.benefit.multiTheme') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/helper.svg', label: t('benefitsPage.supportShort') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/no_advertise.svg', label: t('vip.benefit.noAds') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/high_flag.svg', label: t('benefitsPage.identityTag') },
      { icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/group.svg', label: t('vip.benefit.alphaGroup') },
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
  const goAlphaGroup = () => {
    if (typeof window === 'undefined') return;
    window.open(ALPHA_CORE_GROUP_URL, '_blank', 'noopener,noreferrer');
  };

  // NavBar 需要白色底，否则“pro”模式下会传入 transparent 导致背景不符合设计
  const navBg = '#ffffff';
  const navColor = undefined;

  const containerClassName = [styles.container, containerModeClass, isPc ? styles.pcMode : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName}>
      {showNavBar && (
        <NavBar
          title={t('benefitsPage.title')}
          backgroundColor={navBg}
          showBorder={false}
          color={navColor}
        />
      )}

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
                isPc={isPc}
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
                isPc={isPc}
              />
            )}

            <div className={styles.sectionsBigBox}>
              <div className={styles.section}>
                {tier === 'lite' ? (
                  <div className={styles.sectionTitleLite}>
                    <img
                      className={styles.sectionTitleLiteIcon}
                      src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/flag.svg"
                      alt=""
                      aria-hidden="true"
                    />
                    {t('benefitsPage.exclusiveMemberLine', { name: 'Lite' })}
                  </div>
                ) : tier === 'pro' ? (
                  <div className={styles.sectionTitle}>
                    <img className={styles.sectionTitleProIcon} src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/vip_pro.svg" alt="" aria-hidden="true" />
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
                    <div
                      role="button"
                      tabIndex={0}
                      className={`${styles.upgradePill} ${styles.upgradePillWide}`}
                      onClick={goRecharge}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          goRecharge();
                        }
                      }}
                    >
                      {t('benefitsPage.upgrade')}
                    </div>
                  </div>
                )}
                <div className={styles.lockedList}>
                  {lockedProRows
                    .filter(
                      (x) =>
                        !(
                          tier === 'lite' &&
                          (x.icon === 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/no_advertise.svg' ||
                            x.icon === 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/multi_skin.svg')
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
                      <div
                        role="button"
                        tabIndex={0}
                        className={styles.upgradePill}
                        onClick={() =>
                          tier === 'pro' && x.icon === 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/group.svg' ? goAlphaGroup() : goRecharge()
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            tier === 'pro' && x.icon === 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/group.svg' ? goAlphaGroup() : goRecharge();
                          }
                        }}
                      >
                        {tier === 'pro' && x.icon === 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/group.svg'
                          ? t('benefitsPage.enterAlpha')
                          : t('benefitsPage.upgrade')}
                      </div>
                    </div>
                  ))}
                  {tier === 'lite' && (
                    <div key="lite-identity-tag" className={styles.lockedRow}>
                      <div className={styles.lockedRowLeft}>
                        <img
                          className={styles.lockedRowIconImg}
                          src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/benefits/high_flag.svg"
                          alt=""
                          aria-hidden="true"
                        />
                        <span className={styles.lockedRowLabel}>{t('benefitsPage.identityTag')}</span>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        className={styles.upgradePill}
                        onClick={goRecharge}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goRecharge();
                          }
                        }}
                      >
                        {t('benefitsPage.upgrade')}
                      </div>
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

export default function BenefitsPage() {
  return <BenefitsPageContent />;
}
