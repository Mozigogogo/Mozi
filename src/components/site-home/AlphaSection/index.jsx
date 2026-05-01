import Image from 'next/image';
import styles from './AlphaSection.module.css';
import PromoCopy from '../PromoCopy/index';

export default function AlphaSection() {
  return (
    <section className={styles.alphaSection}>
      <div className={styles.alphaTop}>
        <PromoCopy
          className={styles.alphaCopy}
          title={['Alpha Scanner']}
          subtitle={['Hunt the next 100x gem before the pump.']}
          href="/pc/find"
          ctaText="Get Started"
        />
      </div>

      <div className={styles.alphaBottom} aria-hidden="true">
        <div className={styles.alphaPhoneWrap}>
          <div className={styles.alphaPhone}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_1.svg"
              alt=""
              fill
              className={styles.alphaPhoneImage}
              unoptimized
              sizes="(max-width: 1024px) 92vw, 42vw"
            />
          </div>

          {/* 让这三个资产以手机容器为定位参照 */}
          <div className={`${styles.alphaAsset} ${styles.alphaScoreLeft}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_2.svg"
              alt=""
              fill
              className={styles.alphaAssetImage}
              unoptimized
              sizes="(max-width: 1024px) 34vw, 14vw"
            />
          </div>
          <div className={`${styles.alphaAsset} ${styles.alphaScoreRight}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_3.svg"
              alt=""
              fill
              className={styles.alphaAssetImage}
              unoptimized
              sizes="(max-width: 1024px) 34vw, 14vw"
            />
          </div>
          <div className={`${styles.alphaAsset} ${styles.alphaScoreBottom}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_4.svg"
              alt=""
              fill
              className={styles.alphaAssetImage}
              unoptimized
              sizes="(max-width: 1024px) 42vw, 16vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
