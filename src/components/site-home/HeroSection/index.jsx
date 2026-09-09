import styles from './HeroSection.module.css';
import PromoCopy from '../PromoCopy/index';

const COS_HOME = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/homesite';
const HERO_WEBM_SRC = `${COS_HOME}/ai.webm`;
const HERO_MP4_SRC = `${COS_HOME}/ai.mp4`;

export default function HeroSection() {
  return (
    <div className={styles.stage}>
      <link rel="preload" as="video" href={HERO_WEBM_SRC} type="video/webm" fetchPriority="high" />
      <div className={styles.heroCols}>
        <div className={styles.leftPane}>
          <PromoCopy
            className={styles.heroLeft}
            titleAs="h1"
            title={['Mozi', 'AI Trade Radar']}
            subtitle={['News, OI & Long/Short depth.', 'AI-calculated Win Rate.']}
            href="/ai"
            ctaText="Get Started"
          />
        </div>

        <div className={styles.rightPane}>
          <div className={styles.screenFrame} aria-hidden="true">
            <video
              className={styles.screenImage}
              width={702}
              height={397}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              aria-label="Mozi AI assistant preview"
            >
              <source src={HERO_WEBM_SRC} type="video/webm" />
              <source src={HERO_MP4_SRC} type="video/mp4" />
            </video>
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
      </div>
    </div>
  );
}
