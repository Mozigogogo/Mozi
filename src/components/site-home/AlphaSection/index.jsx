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
          href="/pc/community?tab=discover"
          ctaText="Get Started"
        />
      </div>

      <div className={styles.alphaBottom}>
        <div className={styles.alphaPhoneWrap}>
          <div className={styles.alphaPhone}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_1.svg"
              alt="MoziInnovations Alpha Scanner finding high-potential crypto tokens before the pump"
              fill
              className={styles.alphaPhoneImage}
              unoptimized
              sizes="(max-width: 1024px) 92vw, 42vw"
            />
          </div>

          <div className={`${styles.alphaAsset} ${styles.alphaScoreLeft}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_2.svg"
              alt="MoziInnovations Alpha score card ranking crypto gem opportunities"
              fill
              className={styles.alphaAssetImage}
              unoptimized
              sizes="(max-width: 1024px) 34vw, 14vw"
            />
          </div>
          <div className={`${styles.alphaAsset} ${styles.alphaScoreRight}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_3.svg"
              alt="MoziInnovations Alpha Scanner crypto token opportunity score"
              fill
              className={styles.alphaAssetImage}
              unoptimized
              sizes="(max-width: 1024px) 34vw, 14vw"
            />
          </div>
          <div className={`${styles.alphaAsset} ${styles.alphaScoreBottom}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction5_4.svg"
              alt="MoziInnovations Alpha Scanner quant insights for crypto discovery"
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
