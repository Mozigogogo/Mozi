import Link from 'next/link';
import Image from 'next/image';
import GetStartedArrow from '@/components/icons/GetStartedArrow';
import styles from './site.module.css';

export default function SiteHomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.heroWrap}>
        <div className={styles.stage}>
          <div className={styles.heroLeft}>
            <h1 className={styles.title}>
              AI Trade
              <br />
              Radar
            </h1>
            <p className={styles.subtitle}>
              News, OI & Long/Short depth.
              <br />
              AI-calculated Win Rate.
            </p>
            <div className={styles.ctaRow}>
              <Link className={styles.primaryCta} href="/pc/find">
                <span>Get Started</span>
                <GetStartedArrow />
              </Link>
            </div>
          </div>

          <div className={styles.screenFrame} aria-hidden="true">
            <Image
              src="/images/pc/introduction1.svg"
              alt="Mozi introduction preview"
              fill
              className={styles.screenImage}
              priority
            />
          </div>

          <div className={styles.floatCard}>
            <div className={styles.floatTopPanel}>
              <div className={styles.floatAsk}>Is BTC more likely to go up or down right now?</div>
              <div className={styles.floatDesc}>
                BTC is more likely to rise now, backed by steady ETF inflows, whale accumulation and low exchange sell pressure.
                Hawkish Fed signals and geopolitical risks pose mild downside threats, with neutral near-term technicals.
              </div>
            </div>
            <div className={styles.floatTitle}>AI that answers questions for you, real-time</div>
            <div className={styles.floatSub}>Cluely uses the screen, transcript, and AI to answer questions for you, live.</div>
          </div>
        </div>

        <section className={styles.alertsSection}>
          <h2 className={styles.alertsTitle}>Smart Alerts</h2>
          <p className={styles.alertsSubtitle}>Phone & Email alerts. Catch whales&apos; moves instantly.</p>
          <Link className={styles.alertsCta} href="/pc/alarm">
            <span>See what&apos;s Moving</span>
            <GetStartedArrow />
          </Link>

          <div className={styles.alertBottomPreview} aria-hidden="true">
            <Image
              src="/images/pc/introduction2.svg"
              alt=""
              fill
              className={styles.alertBottomPreviewImage}
            />
          </div>

          <div className={`${styles.alertSideGroup} ${styles.alertSideGroupLeft}`}>
            <div className={styles.alertSideCard}>
              <span>Telephone</span>
              <Image src="/images/pc/phone_alarm.svg" alt="telephone alert" width={80} height={80} />
            </div>
            <div className={styles.alertSideCard}>
              <span>WeChat</span>
              <Image src="/images/pc/helper.svg" alt="wechat alert" width={44} height={44} />
            </div>
          </div>
          <div className={`${styles.alertSideGroup} ${styles.alertSideGroupRight}`}>
            <div className={styles.alertSideCard}>
              <span>Telegram</span>
              <Image src="/images/pc/push.svg" alt="telegram alert" width={44} height={44} />
            </div>
            <div className={styles.alertSideCard}>
              <span>Mail</span>
              <Image src="/images/pc/email.svg" alt="mail alert" width={44} height={44} />
            </div>
          </div>

          <div className={styles.alertTickerGroup}>
            <div className={styles.alertTicker}>
              <div className={styles.alertTickerRow}>
                <span className={styles.alertTickerCoin}>BTC</span>
                <span className={styles.alertTickerUp}>+3.25%</span>
              </div>
            </div>
            <div className={`${styles.alertTicker} ${styles.alertTickerSecondary}`}>
              <div className={styles.alertTickerRow}>
                <span className={styles.alertTickerCoinMuted}>ETH</span>
                <span className={styles.alertTickerDown}>-0.65%</span>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
