import Image from 'next/image';
import styles from './AlertsSection.module.css';
import PromoCopy from '../PromoCopy/index';

const COS_HOME = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/homesite';
const ALERTS_CENTER_WEBM_SRC = `${COS_HOME}/big_order.webm`;
const ALERTS_CENTER_MP4_SRC = `${COS_HOME}/big_order.mp4`;

export default function AlertsSection() {
  return (
    <section className={`${styles.alertsSection} ${styles.alertsSectionLayout}`}>
      <div className={styles.alertsTop}>
        <PromoCopy
          className={`${styles.alertsCopy} ${styles.alertsCopyInLayout}`}
          title={['Smart Alerts']}
          subtitle={["Phone & Email alerts. Catch whales' moves instantly."]}
          href="/detail?symbol=BTC"
          ctaText="See what&apos;s Moving"
        />
      </div>

      {/* 下方内容区域：三列布局（左侧卡/中间动图/右侧卡） */}
      <div className={styles.alertsBottom}>
        <div className={styles.alertsThreeCols}>
          <div className={styles.sideColLeft}>
            <div className={styles.sideStack}>
              <div className={styles.alertSideCard}>
                <span>Telephone</span>
                <div className={`${styles.alertSideIconWrap} ${styles.alertSideIconWrapLarge}`}>
                  <Image
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/telephone.svg"
                    alt="MoziInnovations smart crypto alerts via phone call for whale moves"
                    width={92}
                    height={92}
                    className={`${styles.alertSideIcon} ${styles.alertSideIconLarge}`}
                  />
                </div>
              </div>
              <div className={styles.alertSideCard}>
                <span>WeChat</span>
                <div className={styles.alertSideIconWrap}>
                  <Image
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/wechat.svg"
                    alt="MoziInnovations WeChat crypto price and whale-move alerts"
                    width={80}
                    height={80}
                    className={styles.alertSideIcon}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.centerCol}>
            <div className={styles.centerStage}>
              <div className={styles.alertGifCrop}>
                <video
                  className={styles.alertCenterGif}
                  width={594}
                  height={1280}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="auto"
                  aria-label="MoziInnovations smart alerts catching large crypto whale orders in real time"
                >
                  <source src={ALERTS_CENTER_WEBM_SRC} type="video/webm" />
                  <source src={ALERTS_CENTER_MP4_SRC} type="video/mp4" />
                </video>
              </div>

              <div className={styles.tickerOverlay}>
                <div className={styles.alertTicker}>
                  <div className={styles.alertTickerRow}>
                    <div className={styles.alertTickerCoinWrap}>
                      <Image
                        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/btc.svg"
                        alt="Bitcoin BTC on MoziInnovations crypto market alerts"
                        width={34}
                        height={34}
                        className={styles.alertTickerCoinIcon}
                      />
                      <span className={styles.alertTickerCoin}>BTC</span>
                    </div>
                    <div className={styles.alertTickerChartWrap}>
                      <Image
                        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/line_up.svg"
                        alt="Bitcoin uptrend chart on MoziInnovations crypto data platform"
                        width={145}
                        height={98}
                        className={styles.alertTickerChart}
                      />
                    </div>
                    <span className={styles.alertTickerUp}>
                      <span>+3.25%</span>
                    </span>
                  </div>
                </div>

                <div className={`${styles.alertTicker} ${styles.alertTickerSecondary}`}>
                  <div className={styles.alertTickerRow}>
                    <div className={styles.alertTickerCoinWrap}>
                      <Image
                        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/eth.svg"
                        alt="Ethereum ETH on MoziInnovations crypto market alerts"
                        width={34}
                        height={34}
                        className={styles.alertTickerCoinIcon}
                      />
                      <span className={styles.alertTickerCoinMuted}>ETH</span>
                    </div>
                    <div className={styles.alertTickerChartWrap}>
                      <Image
                        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/line_down.svg"
                        alt="Ethereum downtrend chart on MoziInnovations crypto analytics"
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
            </div>
          </div>

          <div className={styles.sideColRight}>
            <div className={styles.sideStack}>
              <div className={styles.alertSideCard}>
                <span>Telegram</span>
                <div className={`${styles.alertSideIconWrap} ${styles.alertSideIconWrapXL}`}>
                  <Image
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/telegram.svg"
                    alt="MoziInnovations Telegram crypto smart alerts"
                    width={110}
                    height={110}
                    className={`${styles.alertSideIcon} ${styles.alertSideIconXL}`}
                  />
                </div>
              </div>
              <div className={styles.alertSideCard}>
                <span>Mail</span>
                <div className={styles.alertSideIconWrap}>
                  <Image
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/mail.svg"
                    alt="MoziInnovations email crypto price and market alerts"
                    width={80}
                    height={80}
                    className={styles.alertSideIcon}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
