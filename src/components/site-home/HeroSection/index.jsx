import Image from 'next/image';
import styles from './HeroSection.module.css';
import PromoCopy from '../PromoCopy/index';

export default function HeroSection() {
  return (
    <div className={styles.stage}>
      <div className={styles.heroCols}>
        <div className={styles.leftPane}>
          <PromoCopy
            className={styles.heroLeft}
            title={['AI Trade', 'Radar']}
            subtitle={['News, OI & Long/Short depth.', 'AI-calculated Win Rate.']}
            href="/ai"
            ctaText="Get Started"
          />
        </div>

        <div className={styles.rightPane}>
          <div className={styles.screenFrame} aria-hidden="true">
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction1.svg"
              alt="Mozi introduction preview"
              fill
              className={styles.screenImage}
              priority
              sizes="(max-width: 1024px) 92vw, 50vw"
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
      </div>
    </div>
  );
}
