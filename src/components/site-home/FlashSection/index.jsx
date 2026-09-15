import Image from 'next/image';
import styles from './FlashSection.module.css';
import PromoCopy from '../PromoCopy/index';

export default function FlashSection() {
  return (
    <section className={styles.flashSection}>
      <PromoCopy
        className={styles.flashCopy}
        title={['Flash News']}
        subtitle={['Zero noise. Real-time global crypto signal.']}
        href="/pc/community?tab=hot"
        ctaText="Read News"
      />
      <div className={styles.flashPhones}>
        <div className={styles.flashPhoneLeft}>
          <Image
            src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction4_1.svg"
            alt="MoziInnovations Flash News — real-time crypto market headlines and signal feed"
            fill
            className={styles.flashPhoneImage}
            unoptimized
            sizes="(max-width: 1024px) 88vw, 30vw"
          />
        </div>
        <div className={styles.flashPhoneCluster}>
          <div className={`${styles.flashClusterAsset} ${styles.flashClusterAssetLeft}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction4_3.svg"
              alt="MoziInnovations Flash News topic tags for crypto market signals"
              fill
              className={styles.flashClusterAssetImage}
              unoptimized
              sizes="(max-width: 1024px) 32vw, 12vw"
            />
          </div>
          <div className={styles.flashPhone}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction4_2.svg"
              alt="MoziInnovations mobile Flash News for global crypto updates"
              fill
              className={styles.flashPhoneImage}
              unoptimized
              sizes="(max-width: 1024px) 88vw, 30vw"
            />
          </div>
          <div className={`${styles.flashClusterAsset} ${styles.flashClusterAssetRight}`}>
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction4_4.svg"
              alt="MoziInnovations Flash News crypto event cards and market highlights"
              fill
              className={styles.flashClusterAssetImage}
              unoptimized
              sizes="(max-width: 1024px) 32vw, 12vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
