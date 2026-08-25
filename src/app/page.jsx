import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './site.module.css';
import HeroSection from '@/components/site-home/HeroSection/index';
import AlertsSection from '@/components/site-home/AlertsSection/index';
import SectorSection from '@/components/site-home/SectorSection/index';
import FlashSection from '@/components/site-home/FlashSection/index';
import AlphaSection from '@/components/site-home/AlphaSection/index';
import KnowledgeSection from '@/components/site-home/KnowledgeSection/index';
import {
  DEFAULT_DESCRIPTION,
  buildBrandJsonLd,
  buildPageMetadata,
} from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: 'MoziInnovations (Mozi / 墨子) - Crypto Markets, Alerts & Community',
  description: DEFAULT_DESCRIPTION,
  path: '/',
});

function isTelegramServerRequest(ua = '', referer = '') {
  if (/Telegram/i.test(ua)) return true;
  if (/telegram\.org|t\.me/i.test(referer)) return true;
  return false;
}

const { organization: organizationJsonLd, website: websiteJsonLd } =
  buildBrandJsonLd({
    description: DEFAULT_DESCRIPTION,
  });

export default function SiteHomePage() {
  const headerList = headers();
  const ua = headerList.get('user-agent') || '';
  const referer = headerList.get('referer') || '';

  if (isTelegramServerRequest(ua, referer)) {
    redirect('/home');
  }

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <section className={styles.heroWrap}>
        <HeroSection />
        <AlertsSection />
        <SectorSection />
        <FlashSection />
        <AlphaSection />
        <KnowledgeSection />
        <footer className={styles.aboutSeo}>
          <h2 className={styles.aboutSeoTitle}>
            MoziInnovations (Mozi / moz) — Crypto Data Intelligence Platform
          </h2>
          <p className={styles.aboutSeoEn}>
            MoziInnovations (also known as Mozi or moz) is a crypto market intelligence
            platform offering real-time cryptocurrency and US stock data, smart price
            alerts, sector rotation insights, arbitrage radar, AI Q&amp;A, and a trading
            community. Official website: https://moziai.xyz
          </p>
          <p className={styles.aboutSeoZh}>
            MoziInnovations（墨子 Mozi，简称 moz）是加密数据智能分析平台，提供实时加密货币与美股行情、智能价格预警、板块轮动、套利雷达、AI 问答与交易社区。官网：https://moziai.xyz
          </p>
        </footer>
      </section>
    </main>
  );
}
