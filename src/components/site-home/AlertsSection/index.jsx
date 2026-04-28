import Image from 'next/image';
import styles from './AlertsSection.module.css';
import PromoCopy from '../PromoCopy/index';

export default function AlertsSection() {
  return (
    <section className={styles.alertsSection}>
      <PromoCopy
        className={styles.alertsCopy}
        title={['Smart Alerts']}
        subtitle={["Phone & Email alerts. Catch whales' moves instantly."]}
        href="/pc/alarm"
        ctaText="See what&apos;s Moving"
      />
      <div className={styles.alertBottomPreview} aria-hidden="true">
        <Image src="/images/pc/introduction2.svg" alt="" fill className={styles.alertBottomPreviewImage} />
      </div>
      <div className={`${styles.alertSideGroup} ${styles.alertSideGroupLeft}`}>
        <div className={styles.alertSideCard}>
          <span>Telephone</span>
          <div className={`${styles.alertSideIconWrap} ${styles.alertSideIconWrapLarge}`}>
            <Image src="/icons/pc/telephone.svg" alt="telephone alert" width={92} height={92} className={`${styles.alertSideIcon} ${styles.alertSideIconLarge}`} />
          </div>
        </div>
        <div className={styles.alertSideCard}>
          <span>WeChat</span>
          <div className={styles.alertSideIconWrap}>
            <Image src="/icons/pc/wechat.svg" alt="wechat alert" width={80} height={80} className={styles.alertSideIcon} />
          </div>
        </div>
      </div>
      <div className={`${styles.alertSideGroup} ${styles.alertSideGroupRight}`}>
        <div className={styles.alertSideCard}>
          <span>Telegram</span>
          <div className={`${styles.alertSideIconWrap} ${styles.alertSideIconWrapXL}`}>
            <Image src="/icons/pc/telegram.svg" alt="telegram alert" width={110} height={110} className={`${styles.alertSideIcon} ${styles.alertSideIconXL}`} />
          </div>
        </div>
        <div className={styles.alertSideCard}>
          <span>Mail</span>
          <div className={styles.alertSideIconWrap}>
            <Image src="/icons/pc/mail.svg" alt="mail alert" width={80} height={80} className={styles.alertSideIcon} />
          </div>
        </div>
      </div>
      <div className={styles.alertTickerGroup}>
        <div className={styles.alertTicker}>
          <div className={styles.alertTickerRow}>
            <div className={styles.alertTickerCoinWrap}>
              <Image src="/icons/pc/btc.svg" alt="BTC" width={34} height={34} className={styles.alertTickerCoinIcon} />
              <span className={styles.alertTickerCoin}>BTC</span>
            </div>
            <div className={styles.alertTickerChartWrap}>
              <Image src="/icons/pc/line_up.svg" alt="" width={145} height={98} className={styles.alertTickerChart} />
            </div>
            <span className={styles.alertTickerUp}><span>+3.25%</span></span>
          </div>
        </div>
        <div className={`${styles.alertTicker} ${styles.alertTickerSecondary}`}>
          <div className={styles.alertTickerRow}>
            <div className={styles.alertTickerCoinWrap}>
              <Image src="/icons/pc/eth.svg" alt="ETH" width={34} height={34} className={styles.alertTickerCoinIcon} />
              <span className={styles.alertTickerCoinMuted}>ETH</span>
            </div>
            <div className={styles.alertTickerChartWrap}>
              <Image src="/icons/pc/line_down.svg" alt="" width={132} height={73} className={`${styles.alertTickerChart} ${styles.alertTickerChartDown}`} />
            </div>
            <span className={styles.alertTickerDown}><span>-0.65%</span></span>
          </div>
        </div>
      </div>
    </section>
  );
}
