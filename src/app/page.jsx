import Image from 'next/image';
import AppLink from '@/components/AppLink';
import GetStartedArrow from '@/components/Icons/GetStartedArrow';
import RootTelegramRedirect from './RootTelegramRedirect';
import styles from './site.module.css';

function PromoCopy({ title, subtitle, href, ctaText, className = '' }) {
  return (
    <div className={`${styles.promoCopy} ${className}`.trim()}>
      <h2 className={styles.promoTitle}>
        {title.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </h2>
      <p className={styles.promoSubtitle}>
        {subtitle.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
      <div className={styles.ctaRow}>
        <AppLink className={styles.primaryCta} href={href}>
          <span>{ctaText}</span>
          <GetStartedArrow />
        </AppLink>
      </div>
    </div>
  );
}

export default function SiteHomePage() {
  return (
    <main className={styles.page}>
      <RootTelegramRedirect />
      <section className={styles.heroWrap}>
        <div className={styles.stage}>
          <PromoCopy
            className={styles.heroLeft}
            title={['AI Trade', 'Radar']}
            subtitle={['News, OI & Long/Short depth.', 'AI-calculated Win Rate.']}
            href="/pc/find"
            ctaText="Get Started"
          />

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
          <PromoCopy
            className={styles.alertsCopy}
            title={['Smart Alerts']}
            subtitle={["Phone & Email alerts. Catch whales' moves instantly."]}
            href="/pc/alarm"
            ctaText="See what&apos;s Moving"
          />

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
                <span className={styles.alertTickerUp}>
                  <span>+3.25%</span>
                </span>
              </div>
            </div>
            <div className={`${styles.alertTicker} ${styles.alertTickerSecondary}`}>
              <div className={styles.alertTickerRow}>
                <div className={styles.alertTickerCoinWrap}>
                  <Image src="/icons/pc/eth.svg" alt="ETH" width={34} height={34} className={styles.alertTickerCoinIcon} />
                  <span className={styles.alertTickerCoinMuted}>ETH</span>
                </div>
                <div className={styles.alertTickerChartWrap}>
                  <Image
                    src="/icons/pc/line_down.svg"
                    alt=""
                    width={132}
                    height={73}
                    className={`${styles.alertTickerChart} ${styles.alertTickerChartDown}`}
                  />
                </div>
                <span className={styles.alertTickerDown}>
                  <span>-0.65%</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.sectorSection}>
          <div className={styles.sectorContent}>
            <PromoCopy
              className={styles.sectorLeft}
              title={['Sector', 'Rotation']}
              subtitle={['Ride the trend. One-click', 'to find the sector leaders']}
              href="/pc/find"
              ctaText="Enter Mozi"
            />

            <div className={styles.sectorPreview} aria-hidden="true">
              <Image
                src="/images/pc/introduction3.svg"
                alt=""
                fill
                className={styles.sectorPreviewImage}
              />
            </div>
          </div>
        </section>

        <section className={styles.flashSection}>
          <PromoCopy
            className={styles.flashCopy}
            title={['Flash News']}
            subtitle={['Zero noise. Real-time global crypto signal.']}
            href="/pc/news"
            ctaText="Read News"
          />

          <div className={styles.flashPhones}>
            <div className={styles.flashPhone}>
              <Image src="/images/pc/introduction4_1.svg" alt="flash news left preview" fill className={styles.flashPhoneImage} />
            </div>
            <div className={styles.flashPhoneCluster}>
              <div className={`${styles.flashClusterAsset} ${styles.flashClusterAssetLeft}`}>
                <Image src="/images/pc/introduction4_3.svg" alt="" fill className={styles.flashClusterAssetImage} />
              </div>
              <div className={styles.flashPhone}>
                <Image src="/images/pc/introduction4_2.svg" alt="flash news right preview" fill className={styles.flashPhoneImage} />
              </div>
              <div className={`${styles.flashClusterAsset} ${styles.flashClusterAssetRight}`}>
                <Image src="/images/pc/introduction4_4.svg" alt="" fill className={styles.flashClusterAssetImage} />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.alphaSection}>
          <PromoCopy
            className={styles.alphaCopy}
            title={['Alpha Scanner']}
            subtitle={['Hunt the next 100x gem before the pump.']}
            href="/pc/find"
            ctaText="Get Started"
          />

          <div className={styles.alphaPhoneWrap}>
            <div className={styles.alphaPhone}>
              <Image src="/images/pc/introduction5_1.svg" alt="alpha scanner preview" fill className={styles.alphaPhoneImage} />
            </div>
          </div>

          <div className={`${styles.alphaAsset} ${styles.alphaScoreLeft}`}>
            <Image src="/images/pc/introduction5_2.svg" alt="" fill className={styles.alphaAssetImage} />
          </div>

          <div className={`${styles.alphaAsset} ${styles.alphaScoreRight}`}>
            <Image src="/images/pc/introduction5_3.svg" alt="" fill className={styles.alphaAssetImage} />
          </div>

          <div className={`${styles.alphaAsset} ${styles.alphaScoreBottom}`}>
            <Image src="/images/pc/introduction5_4.svg" alt="" fill className={styles.alphaAssetImage} />
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
            <AppLink className={`${styles.primaryCta} ${styles.knowledgeCta}`} href="/pc/find">
              <span>Learn more</span>
              <GetStartedArrow />
            </AppLink>
          </div>

          <div className={styles.knowledgePhone} aria-hidden="true">
            <Image src="/images/pc/introduction6_2.svg" alt="" fill className={styles.knowledgePhoneImage} />
          </div>

          <div className={styles.knowledgeOverlay} aria-hidden="true">
            <Image src="/images/pc/introduction6_3.png" alt="" fill className={styles.knowledgeOverlayImage} />
          </div>

        </section>
      </section>
    </main>
  );
}
