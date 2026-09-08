import {
  BRAND_LEGAL_NAME,
  PRIMARY_SITE_HUBS,
  absoluteUrl,
  buildPrimaryNavJsonLd,
} from '@/utils/seoConfig';
import styles from './hubSeo.module.css';

function buildHubPageJsonLdForPath(hub, path) {
  const url = absoluteUrl(path);
  return {
    webPage: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      name: hub.title,
      description: hub.description,
      url,
      inLanguage: ['zh-CN', 'en'],
      isPartOf: {
        '@type': 'WebSite',
        name: BRAND_LEGAL_NAME,
        url: absoluteUrl('/'),
      },
      publisher: {
        '@type': 'Organization',
        name: BRAND_LEGAL_NAME,
        url: absoluteUrl('/'),
      },
    },
    breadcrumb: {
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
          name: hub.nameZh,
          item: url,
        },
      ],
    },
  };
}

/**
 * 枢纽页服务端 SEO：JSON-LD + 可抓取 h1/摘要 + 四大入口互链
 */
export default function SiteHubSeo({
  hubKey,
  pathOverride,
  extraListItems = [],
  includeNavSchema = true,
}) {
  const hub = PRIMARY_SITE_HUBS.find((item) => item.key === hubKey);
  if (!hub) return null;

  const path = pathOverride || hub.path;
  const jsonLd = buildHubPageJsonLdForPath(hub, path);
  const navJsonLd = includeNavSchema ? buildPrimaryNavJsonLd() : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
      />
      {navJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(navJsonLd) }}
        />
      ) : null}
      <section className={styles.seoIntro} aria-label={`${BRAND_LEGAL_NAME} ${hub.nameZh}`}>
        <h1 className={styles.seoTitle}>{hub.title}</h1>
        <p className={styles.seoDesc}>{hub.description}</p>
        {extraListItems.length > 0 ? (
          <ul className={styles.seoList}>
            {extraListItems.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        ) : null}
        <nav className={styles.seoNav} aria-label={`${BRAND_LEGAL_NAME} 主要入口`}>
          {PRIMARY_SITE_HUBS.map((item) => (
            <a key={item.key} href={item.path}>
              {item.nameZh}
            </a>
          ))}
        </nav>
      </section>
    </>
  );
}
