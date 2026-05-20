import styles from './site.module.css';
import HeroSection from '@/components/site-home/HeroSection/index';
import AlertsSection from '@/components/site-home/AlertsSection/index';
import SectorSection from '@/components/site-home/SectorSection/index';
import FlashSection from '@/components/site-home/FlashSection/index';
import AlphaSection from '@/components/site-home/AlphaSection/index';
import KnowledgeSection from '@/components/site-home/KnowledgeSection/index';

export default function SiteHomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.heroWrap}>
        <HeroSection />
        <AlertsSection />
        <SectorSection />
        <FlashSection />
        <AlphaSection />
        <KnowledgeSection />
      </section>
    </main>
  );
}
