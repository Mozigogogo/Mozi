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
  SITE_NAME_ZH,
  SITE_URL,
  buildPageMetadata,
} from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '墨子 Mozi - 加密货币行情、预警与社区',
  description:
    '墨子官方网站：实时加密行情、板块热度、价格预警、套利雷达与社区讨论，覆盖主流交易所数据。',
  path: '/',
});

function isTelegramServerRequest(ua = '', referer = '') {
  if (/Telegram/i.test(ua)) return true;
  if (/telegram\.org|t\.me/i.test(referer)) return true;
  return false;
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME_ZH,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
  description: DEFAULT_DESCRIPTION,
  sameAs: [
    'https://t.me/MoziInnovations',
    'https://x.com/moziinnovation',
    'https://discord.gg/GJW6h9GNQ8',
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME_ZH,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
};

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
      </section>
    </main>
  );
}
