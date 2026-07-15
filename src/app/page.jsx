import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './site.module.css';
import HeroSection from '@/components/site-home/HeroSection/index';
import AlertsSection from '@/components/site-home/AlertsSection/index';
import SectorSection from '@/components/site-home/SectorSection/index';
import FlashSection from '@/components/site-home/FlashSection/index';
import AlphaSection from '@/components/site-home/AlphaSection/index';
import KnowledgeSection from '@/components/site-home/KnowledgeSection/index';

function isTelegramServerRequest(ua = '', referer = '') {
  if (/Telegram/i.test(ua)) return true;
  if (/telegram\.org|t\.me/i.test(referer)) return true;
  return false;
}

export default function SiteHomePage() {
  const headerList = headers();
  const ua = headerList.get('user-agent') || '';
  const referer = headerList.get('referer') || '';

  if (isTelegramServerRequest(ua, referer)) {
    redirect('/home');
  }

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
