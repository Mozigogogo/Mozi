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
  DEFAULT_TITLE,
  buildBrandJsonLd,
  buildPageMetadata,
} from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: DEFAULT_TITLE,
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
            MoziInnovations (Mozi / moz) — AI Prediction &amp; Crypto Data Intelligence
          </h2>
          <p className={styles.aboutSeoEn}>
            MoziInnovations (also known as Mozi or moz) is a crypto data intelligence platform
            offering AI market prediction, quant strategy assistant, smart price alerts, sector
            rotation insights, arbitrage radar, and a trading community. Official website:
            https://moziai.xyz
          </p>
          <p className={styles.aboutSeoZh}>
            MoziInnovations（墨子 Mozi，简称 moz）是加密货币数据分析平台，提供 AI 行情预测、量化策略助手、智能价格预警、板块轮动、套利雷达与交易社区。官网：https://moziai.xyz
          </p>
        </footer>
      </section>
    </main>
  );
}
