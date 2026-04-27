import Link from 'next/link';
import styles from './site.module.css';

export default function SiteHomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.heroWrap}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <h1 className={styles.title}>
              AI Trade
              <br />
              Radar
            </h1>
            <p className={styles.subtitle}>
              News, market sentiment, and long/short depth in one place.
              <br />
              AI-calculated win-rate and actionable insights for traders.
            </p>
            <div className={styles.ctaRow}>
              <Link className={styles.primaryCta} href="/pc/find">
                Get Started
              </Link>
            </div>
          </div>

          <div className={styles.heroRight} aria-hidden="true">
            <div className={styles.screenFrame}>
              <div className={styles.screenTop} />
              <div className={styles.screenBody}>
                <div className={styles.bubbleRowRight}>
                  <div className={styles.bubbleSm}>What is the current trend of BTC?</div>
                </div>
                <div className={styles.bubbleRowLeft}>
                  <div className={styles.bubbleLg}>
                    AI analysis indicates short-term volatility with a mild bullish bias. ETF inflows and positive macro tone
                    support upside, while geopolitical risks still warrant caution.
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.floatCard}>
              <div className={styles.floatAsk}>Is BTC more likely to go up or down right now?</div>
              <div className={styles.floatDesc}>
                BTC is more likely to rise now, backed by steady ETF inflows, whale accumulation and low exchange sell pressure.
              </div>
              <div className={styles.floatTitle}>AI that answers questions for you, real-time</div>
              <div className={styles.floatSub}>Analyzes price action, transcripts, and news as it happens.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
