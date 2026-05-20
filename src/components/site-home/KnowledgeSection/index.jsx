import Image from 'next/image';
import AppLink from '@/components/AppLink';
import GetStartedArrow from '@/components/Icons/GetStartedArrow';
import styles from './KnowledgeSection.module.css';

export default function KnowledgeSection() {
  return (
    <section className={styles.knowledgeSection}>
      <div className={styles.knowledgeCols}>
        <div className={styles.knowledgeLeftPane}>
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
            <AppLink className={`${styles.primaryCta} ${styles.knowledgeCta}`} href="/pc/community?tab=qa">
              <span>Learn more</span>
              <GetStartedArrow />
            </AppLink>
          </div>
        </div>

        <div className={styles.knowledgeRightPane}>
          <div className={styles.knowledgePhoneWrap} aria-hidden="true">
            <Image
              src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction6_2.svg"
              alt=""
              fill
              className={styles.knowledgePhoneImage}
              unoptimized
              sizes="(max-width: 1024px) 90vw, 42vw"
            />
            
          </div>
        </div>
        <div className={styles.knowledgeOverlay} aria-hidden="true">
              <Image
                src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction6_3.png"
                alt=""
                fill
                className={styles.knowledgeOverlayImage}
                sizes="(max-width: 1024px) 70vw, 36vw"
              />
        </div>
      </div>
    </section>
  );
}
