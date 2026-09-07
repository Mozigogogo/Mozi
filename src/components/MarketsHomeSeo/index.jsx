import {
  BRAND_LEGAL_NAME,
  absoluteUrl,
} from '@/utils/seoConfig';
import styles from './MarketsHomeSeo.module.css';

/**
 * /home 行情首页服务端 SEO 块：在 HomeClient（纯 client + dynamic）之前输出可抓取正文
 */
export default function MarketsHomeSeo() {
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl('/home')}#webpage`,
    name: `Markets Home | ${BRAND_LEGAL_NAME}`,
    description: `${BRAND_LEGAL_NAME}（Mozi / 墨子）行情首页：AI 驱动的加密货币数据分析、热门币种、板块轮动与量化策略洞察。`,
    url: absoluteUrl('/home'),
    isPartOf: {
      '@type': 'WebSite',
      name: BRAND_LEGAL_NAME,
      url: absoluteUrl('/'),
    },
    about: [
      { '@type': 'Thing', name: 'Cryptocurrency market data' },
      { '@type': 'Thing', name: 'AI market prediction' },
      { '@type': 'Thing', name: '加密货币行情' },
    ],
    publisher: {
      '@type': 'Organization',
      name: BRAND_LEGAL_NAME,
      url: absoluteUrl('/'),
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: BRAND_LEGAL_NAME,
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Markets Home',
        item: absoluteUrl('/home'),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <section className={styles.seoIntro} aria-label={`${BRAND_LEGAL_NAME} markets home`}>
        <h1 className={styles.seoTitle}>
          {BRAND_LEGAL_NAME}（Mozi / 墨子）行情首页
        </h1>
        <p className={styles.seoDesc}>
          AI 驱动的加密货币数据分析平台：热门币种、板块轮动、实时榜单、套利机会与量化策略洞察。
          Crypto markets home with trending coins, sector analytics, rankings and quant insights.
        </p>
        <ul className={styles.seoList}>
          <li>热门币种与实时涨跌榜</li>
          <li>板块轮动与市场分布</li>
          <li>AI 预测与量化策略助手入口</li>
          <li>套利雷达与智能价格预警</li>
        </ul>
      </section>
    </>
  );
}
