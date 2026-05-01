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
        href="/pc/news"
        ctaText="Read News"
      />
      <div className={styles.flashPhones}>
        <div className={styles.flashPhoneLeft}>
          <Image
            src="/images/pc/introduction4_1.svg"
            alt="flash news left preview"
            fill
            className={styles.flashPhoneImage}
            sizes="(max-width: 1024px) 88vw, 30vw"
          />
        </div>
        <div className={styles.flashPhoneCluster}>
          <div className={`${styles.flashClusterAsset} ${styles.flashClusterAssetLeft}`}>
            <Image
              src="/images/pc/introduction4_3.svg"
              alt=""
              fill
              className={styles.flashClusterAssetImage}
              sizes="(max-width: 1024px) 32vw, 12vw"
            />
          </div>
          <div className={styles.flashPhone}>
            <Image
              src="/images/pc/introduction4_2.svg"
              alt="flash news right preview"
              fill
              className={styles.flashPhoneImage}
              sizes="(max-width: 1024px) 88vw, 30vw"
            />
          </div>
          <div className={`${styles.flashClusterAsset} ${styles.flashClusterAssetRight}`}>
            <Image
              src="/images/pc/introduction4_4.svg"
              alt=""
              fill
              className={styles.flashClusterAssetImage}
              sizes="(max-width: 1024px) 32vw, 12vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
