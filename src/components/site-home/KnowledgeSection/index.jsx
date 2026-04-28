import Image from 'next/image';
import AppLink from '@/components/AppLink';
import GetStartedArrow from '@/components/Icons/GetStartedArrow';
import styles from './KnowledgeSection.module.css';

export default function KnowledgeSection() {
  return (
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
  );
}
