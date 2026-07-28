'use client';

import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/** 公众号二维码（与「我的」页关注公众号一致） */
export const WECHAT_OFFICIAL_QR_URL =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_account.jpg';

const FEATURES = [
  {
    key: 'whale',
    iconBg: '#FEE2E2',
    titleKey: 'oneClickAlarm.wechatQrFeatureWhale',
    tagKey: 'oneClickAlarm.wechatQrFeatureWhaleTag',
    tagBg: '#FCE7F3',
    tagColor: '#BE185D',
    emoji: '⚡',
  },
  {
    key: 'crash',
    iconBg: '#D1FAE5',
    titleKey: 'oneClickAlarm.wechatQrFeatureCrash',
    tagKey: 'oneClickAlarm.wechatQrFeatureCrashTag',
    tagBg: '#FFEDD5',
    tagColor: '#C2410C',
    emoji: '🔔',
  },
  {
    key: 'vip',
    iconBg: '#EDE9FE',
    titleKey: 'oneClickAlarm.wechatQrFeatureVip',
    tagKey: 'oneClickAlarm.wechatQrFeatureVipTag',
    tagBg: '#FEE2E2',
    tagColor: '#B91C1C',
    emoji: '🎁',
  },
];

/** 微信告警详情页主体内容 */
export default function WechatAlertDetailContent({ isPc = false } = {}) {
  const { t } = useTranslation();
  const scanHint = isPc
    ? t('oneClickAlarm.wechatQrScanHintPc')
    : t('oneClickAlarm.wechatQrScanHint');

  return (
    <div className={`${styles.pageBody} ${isPc ? styles.pageBodyPc : ''}`}>
      <div className={`${styles.panel} ${isPc ? styles.panelPc : ''}`}>
        <div className={styles.topPill}>
          <span className={styles.topPillDot} />
          {scanHint}
          <span className={styles.topPillDot} />
        </div>

        <div className={styles.qrWrap}>
          <span className={styles.chevronLeft} aria-hidden>
            »
          </span>
          <div className={`${styles.qrBox} ${isPc ? styles.qrBoxPc : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.qrImg}
              src={WECHAT_OFFICIAL_QR_URL}
              alt={t('user.officialAccountQRCodeAlt')}
            />
            {!isPc && (
              <span className={styles.hand} aria-hidden>
                👉
              </span>
            )}
          </div>
          <span className={styles.chevronRight} aria-hidden>
            «
          </span>
        </div>

        <div className={styles.divider} />

        <div className={styles.midPill}>{t('oneClickAlarm.wechatQrBenefitsTitle')}</div>

        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.key} className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: f.iconBg }}>
                {f.emoji}
              </div>
              <div className={styles.featureTitle}>{t(f.titleKey)}</div>
              <span
                className={styles.featureTag}
                style={{ background: f.tagBg, color: f.tagColor }}
              >
                {t(f.tagKey)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className={`${styles.footerNote} ${isPc ? styles.footerNotePc : ''}`}>
        <span className={styles.footerDot} />
        {t('oneClickAlarm.wechatQrFooter')}
      </p>
    </div>
  );
}
