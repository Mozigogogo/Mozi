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

        <section className={styles.sectorSection}>
          <div className={styles.sectorContent}>
            <div className={styles.sectorLeft}>
              <h2 className={styles.sectorTitle}>
                Sector
                <br />
                Rotation
              </h2>
              <p className={styles.sectorSubtitle}>Ride the trend. One-click to find the sector leaders</p>
              <Link className={styles.sectorCta} href="/pc/find">
                <span>Enter Mozi</span>
                <GetStartedArrow />
              </Link>
            </div>

            <div className={styles.sectorPreview} aria-hidden="true">
              <Image
                src="/images/pc/lite_hero.png"
                alt=""
                fill
                className={styles.sectorPreviewImage}
              />
            </div>
          </div>
        </section>

        <section className={styles.flashSection}>
          <h2 className={styles.flashTitle}>Flash News</h2>
          <p className={styles.flashSubtitle}>Zero noise. Real-time global crypto signal.</p>
          <Link className={styles.flashCta} href="/pc/news">
            <span>Read News</span>
            <GetStartedArrow />
          </Link>

          <div className={styles.flashPhones}>
            <div className={styles.flashPhone}>
              <Image src="/images/pc/introduction2.svg" alt="flash news left preview" fill className={styles.flashPhoneImage} />
            </div>
            <div className={styles.flashPhone}>
              <Image src="/images/pc/introduction2.svg" alt="flash news right preview" fill className={styles.flashPhoneImage} />
            </div>
          </div>

          <div className={styles.flashOverlayCardLeft}>
            <div className={styles.flashOverlayHead}>Flash</div>
            <p>Fed will speak tomorrow; risk assets may stay range-bound before macro clarity.</p>
          </div>
          <div className={styles.flashOverlayCardRight}>
            <div className={styles.flashOverlayHead}>Brief</div>
            <p>BTC options IV cools while spot ETF inflows stay stable; watch NY open liquidity.</p>
          </div>
        </section>

        <section className={styles.alphaSection}>
          <h2 className={styles.alphaTitle}>Alpha Scanner</h2>
          <p className={styles.alphaSubtitle}>Hunt the next 100x gem before the pump.</p>
          <Link className={styles.alphaCta} href="/pc/find">
            <span>Get Started</span>
            <GetStartedArrow />
          </Link>

          <div className={styles.alphaPhoneWrap}>
            <div className={styles.alphaPhone}>
              <Image src="/images/pc/introduction2.svg" alt="alpha scanner preview" fill className={styles.alphaPhoneImage} />
            </div>
          </div>

          <div className={`${styles.alphaScoreCard} ${styles.alphaScoreLeft}`}>
            <div className={styles.alphaScoreHead}>
              <Image src="/images/pc/phone_alarm.svg" alt="btc" width={24} height={24} />
              <span>BTC</span>
            </div>
            <div className={`${styles.alphaGauge} ${styles.alphaGaugeStrong}`}>
              <span>76</span>
            </div>
          </div>

          <div className={`${styles.alphaScoreCard} ${styles.alphaScoreRight}`}>
            <div className={styles.alphaScoreHead}>
              <Image src="/images/pc/push.svg" alt="eth" width={24} height={24} />
              <span>ETH</span>
            </div>
            <div className={`${styles.alphaGauge} ${styles.alphaGaugeMid}`}>
              <span>55</span>
            </div>
          </div>

          <div className={`${styles.alphaScoreCard} ${styles.alphaScoreBottom}`}>
            <div className={styles.alphaScoreHead}>
              <Image src="/images/pc/helper.svg" alt="usdt" width={24} height={24} />
              <span>USDT</span>
            </div>
            <div className={`${styles.alphaGauge} ${styles.alphaGaugeLow}`}>
              <span>16</span>
            </div>
          </div>
        </section>

        <section className={styles.knowledgeSection}>
          <div className={styles.knowledgeLeft}>
            <h2 className={styles.knowledgeTitle}>
              Knowledge
              <br />
              Hub
            </h2>
            <p className={styles.knowledgeSubtitle}>
              No more confusion.
              <br />
              Ask anything, get clarity.
            </p>
            <Link className={styles.knowledgeCta} href="/pc/find">
              <span>Learn more</span>
              <GetStartedArrow />
            </Link>
          </div>

          <div className={styles.knowledgePhone} aria-hidden="true">
            <Image src="/images/pc/introduction2.svg" alt="" fill className={styles.knowledgePhoneImage} />
          </div>

          <div className={styles.knowledgeCards}>
            <article className={styles.knowledgeCard}>
              <div className={styles.knowledgeCardUser}>Joestar</div>
              <p>BTC just pumped 8% in an hour - is it too late to buy now?</p>
              <div className={styles.knowledgeCardMeta}>221 · 133</div>
            </article>
            <article className={styles.knowledgeCard}>
              <div className={styles.knowledgeCardUser}>Lauren</div>
              <p>How do people actually spot whale accumulation early?</p>
              <div className={styles.knowledgeCardMeta}>156 · 89</div>
            </article>
            <article className={styles.knowledgeCard}>
              <div className={styles.knowledgeCardUser}>Mr.Mon</div>
              <p>Open interest is rising but the price isn&apos;t moving much - what does that usually mean?</p>
              <div className={styles.knowledgeCardMeta}>170 · 103</div>
            </article>
            <article className={styles.knowledgeCard}>
              <div className={styles.knowledgeCardUser}>Arthur</div>
              <p>When a coin pumps fast, how do we tell whether to chase or wait?</p>
              <div className={styles.knowledgeCardMeta}>98 · 61</div>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
