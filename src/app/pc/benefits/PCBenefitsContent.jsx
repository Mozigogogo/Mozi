'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PCBenefitsContent.module.less';

const MY_SUBSCRIPTION_PLAN_CODE_KEY = 'mozi_my_subscription_plan_code_v1';

const planCodeToTier = (planCode) => {
  const raw = String(planCode || '').trim().toUpperCase();
  if (!raw || raw === 'FREE' || raw === '0' || raw === 'NONE') return 'free';
  if (raw.includes('PRO')) return 'pro';
  if (raw.includes('LITE')) return 'lite';
  return 'lite';
};

export default function PCBenefitsContent() {
  const { t } = useTranslation();
  const [tier, setTier] = useState('lite');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTier = () => {
      try {
        setTier(planCodeToTier(window.localStorage.getItem(MY_SUBSCRIPTION_PLAN_CODE_KEY)));
      } catch (_) {}
    };

    syncTier();
    window.addEventListener('storage', syncTier);
    const onPlanCodeUpdated = (e) => setTier(planCodeToTier(e?.detail?.planCode));
    window.addEventListener('mozi:subscriptionPlanCodeUpdated', onPlanCodeUpdated);
    return () => {
      window.removeEventListener('storage', syncTier);
      window.removeEventListener('mozi:subscriptionPlanCodeUpdated', onPlanCodeUpdated);
    };
  }, []);

  const isPro = tier === 'pro';
  const pointsCur = isPro ? 9518 : 4518;
  const pointsMax = isPro ? 10000 : 5000;
  const aiCur = 12;
  const aiMax = isPro ? 200 : 40;
  const depthText = isPro ? t('benefitsPage.depth40') : t('benefitsPage.depth20');

  const quickIcons = useMemo(
    () => [
      { icon: '/images/pc/line.svg', label: t('vip.benefit.basicChart') },
      { icon: '/images/pc/push.svg', label: t('vip.benefit.basicPush') },
      { icon: '/images/pc/email.svg', label: t('benefitsPage.emailAlerts') },
      { icon: '/images/pc/skin.svg', label: t('vip.benefit.multiTheme') },
      { icon: '/images/pc/helper.svg', label: t('benefitsPage.supportShort') },
      { icon: '/images/pc/no_ad.svg', label: t('vip.benefit.noAds') },
      { icon: '/images/pc/flag.svg', label: t('benefitsPage.identityTag') },
    ],
    [t]
  );

  const lockedItems = useMemo(
    () => [
      { icon: '/benefits/group.svg', label: t('vip.benefit.alphaGroup') },
      { icon: '/benefits/helper.svg', label: t('benefitsPage.exclusiveService') },
      { icon: '/benefits/high_flag.svg', label: t('benefitsPage.identityTag') },
    ],
    [t]
  );

  return (
    <div className={`${styles.pcBenefits} ${isPro ? styles.isPro : ''}`}>
      <section className={styles.heroBanner}>
        <div className={styles.heroText}>
          <div className={styles.heroSub}>{t('benefitsPage.heroSub')}</div>
          <div className={styles.heroDays}>
            <span className={styles.daysNum}>259</span>
            <span className={styles.daysUnit}>{t('benefitsPage.daysUnit')}</span>
          </div>
        </div>
      </section>

      <section className={styles.mainShell}>
        <div className={styles.topGrid}>
          <div className={styles.leftColumn}>
            <div className={styles.planCard}>
              <div className={styles.planHeader}>
                <div>
                  <div className={styles.planTitle}>{isPro ? 'Pro-1' : 'Lite'}</div>
                  <div className={styles.planSub}>{isPro ? t('benefitsPage.planSubPro') : t('benefitsPage.planSubLite')}</div>
                </div>
                <img className={styles.tierBadge} src={isPro ? '/benefits/vip_pro1.svg' : '/benefits/flag.svg'} alt="" />
              </div>

              <div className={styles.pointsLabel}>{t('benefitsPage.pointsThisMonth')}</div>
              <div className={styles.pointsRow}>
                <span className={styles.pointsCur}>{pointsCur.toLocaleString()}</span>
                <span className={styles.pointsMax}>/{pointsMax.toLocaleString()}</span>
              </div>
              <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${(pointsCur / pointsMax) * 100}%` }} /></div>
              <div className={styles.validityRow}>
                {t('benefitsPage.validUntil', { tier: isPro ? 'Pro' : 'Lite', date: '2026-04-12' })}{' '}
                <span className={styles.dayTag}>{t('benefitsPage.daysLeftTag', { n: 22 })}</span>
              </div>
            </div>

            <div className={styles.benefitsPanel}>
              <div className={styles.benefitsHeader}>
                <img src={isPro ? '/benefits/vip_pro.svg' : '/benefits/flag.svg'} alt="" />
                <span>{t('benefitsPage.exclusiveMemberLine', { name: isPro ? 'Pro1' : 'Lite' })}</span>
              </div>

              <div className={`${styles.metricCard} ${styles.metricCardFirst}`}>
                <div className={styles.metricTop}>
                  <span className={styles.metricLabelWithIcon}>
                    <img src="/benefits/monthly_points.svg" alt="" />
                    <span>{t('benefitsPage.monthlyPoints')}</span>
                  </span>
                  <span>{pointsCur}/{pointsMax}</span>
                </div>
                <div className={styles.metricTrack}><div className={styles.metricFillPurple} style={{ width: `${(pointsCur / pointsMax) * 100}%` }} /></div>
              </div>

              <div className={`${styles.metricCard} ${styles.metricCardSecond}`}>
                <div className={styles.metricTop}>
                  <span className={styles.metricLabelWithIcon}>
                    <img src="/benefits/ai_call.svg" alt="" />
                    <span>{t('benefitsPage.aiCall')}</span>
                  </span>
                  <span>{aiCur}/{aiMax}</span>
                </div>
                <div className={styles.metricTrack}><div className={styles.metricFillBlue} style={{ width: `${(aiCur / aiMax) * 100}%` }} /></div>
              </div>

              <div className={`${styles.metricCard} ${styles.metricCardThird}`}>
                <div className={styles.metricTop}>
                  <span className={styles.metricLabelWithIcon}>
                    <img src="/benefits/big_deal.svg" alt="" />
                    <span>{t('vipRecharge.features.bigOrder')}</span>
                  </span>
                  <span>{depthText}</span>
                </div>
              </div>

              <div className={styles.iconRow}>
                {quickIcons.map((item) => (
                  <div key={item.label} className={styles.iconItem}>
                    <img src={item.icon} alt="" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.lockedPanel}>
            <div className={styles.lockedTitle}>{t('benefitsPage.lockedSection', { defaultValue: '未解锁权益' })}</div>
            {lockedItems.map((item) => (
              <div key={item.label} className={styles.lockedRow}>
                <div className={styles.lockedRowLeft}>
                  <img src={item.icon} alt="" />
                  <span>{item.label}</span>
                </div>
                <button type="button">{t('benefitsPage.upgrade')}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
