import Image from 'next/image';
import styles from './AlertsSection.module.css';
import PromoCopy from '../PromoCopy/index';

const ALERTS_CENTER_GIF_SRC =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/big_order.gif';

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
        <div className={styles.alertsThreeCols} aria-hidden="true">
          <div className={styles.sideColLeft}>
            <div className={styles.sideStack}>
              <div className={styles.alertSideCard}>
                <span>Telephone</span>
                <div className={`${styles.alertSideIconWrap} ${styles.alertSideIconWrapLarge}`}>
                  <Image
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/telephone.svg"
                    alt="telephone alert"
                    width={92}
                    height={92}
                    className={`${styles.alertSideIcon} ${styles.alertSideIconLarge}`}
                  />
                </div>
              </div>
              <div className={styles.alertSideCard}>
                <span>WeChat</span>
                <div className={styles.alertSideIconWrap}>
                  <Image src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/wechat.svg" alt="wechat alert" width={80} height={80} className={styles.alertSideIcon} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.centerCol}>
            <div className={styles.centerStage}>
              <div className={styles.alertGifCrop}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ALERTS_CENTER_GIF_SRC}
                  alt="Mozi smart alerts preview"
                  className={styles.alertCenterGif}
                  loading="eager"
                  decoding="async"
                />
              </div>

              <div className={styles.tickerOverlay}>
                <div className={styles.alertTicker}>
                  <div className={styles.alertTickerRow}>
                    <div className={styles.alertTickerCoinWrap}>
                      <Image src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/btc.svg" alt="BTC" width={34} height={34} className={styles.alertTickerCoinIcon} />
                      <span className={styles.alertTickerCoin}>BTC</span>
                    </div>
                    <div className={styles.alertTickerChartWrap}>
                      <Image src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/line_up.svg" alt="" width={145} height={98} className={styles.alertTickerChart} />
                    </div>
                    <span className={styles.alertTickerUp}>
                      <span>+3.25%</span>
                    </span>
                  </div>
                </div>

                <div className={`${styles.alertTicker} ${styles.alertTickerSecondary}`}>
                  <div className={styles.alertTickerRow}>
                    <div className={styles.alertTickerCoinWrap}>
                      <Image src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/eth.svg" alt="ETH" width={34} height={34} className={styles.alertTickerCoinIcon} />
                      <span className={styles.alertTickerCoinMuted}>ETH</span>
                    </div>
                    <div className={styles.alertTickerChartWrap}>
                      <Image
                        src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/line_down.svg"
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
            </div>
          </div>

          <div className={styles.sideColRight}>
            <div className={styles.sideStack}>
              <div className={styles.alertSideCard}>
                <span>Telegram</span>
                <div className={`${styles.alertSideIconWrap} ${styles.alertSideIconWrapXL}`}>
                  <Image
                    src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/telegram.svg"
                    alt="telegram alert"
                    width={110}
                    height={110}
                    className={`${styles.alertSideIcon} ${styles.alertSideIconXL}`}
                  />
                </div>
              </div>
              <div className={styles.alertSideCard}>
                <span>Mail</span>
                <div className={styles.alertSideIconWrap}>
                  <Image src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/mail.svg" alt="mail alert" width={80} height={80} className={styles.alertSideIcon} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
