import { cookies } from 'next/headers';
import {
  BRAND_LEGAL_NAME,
  PRIMARY_SITE_HUBS,
  absoluteUrl,
  buildPrimaryNavJsonLd,
} from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getHubSeoCopy, resolveSeoLng, seoLngFromCookieValue } from '@/utils/seoI18n';
import styles from './hubSeo.module.css';

function buildHubPageJsonLdForPath(hub, path, copy, lng) {
  const url = absoluteUrl(path);
  const isZh = resolveSeoLng(lng) === 'zh';
  return {
    webPage: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      name: copy.title,
      description: copy.description,
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
          name: isZh ? hub.nameZh : hub.nameEn,
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

  const lng = seoLngFromCookieValue(cookies().get(I18N_COOKIE_KEY)?.value);
  const isZh = resolveSeoLng(lng) === 'zh';
  const copy = getHubSeoCopy(hubKey, lng);
  const path = pathOverride || hub.path;
  const jsonLd = buildHubPageJsonLdForPath(hub, path, copy, lng);
  const navJsonLd = includeNavSchema ? buildPrimaryNavJsonLd() : null;
  const hubLabel = isZh ? hub.nameZh : hub.nameEn;

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
      <section className={styles.seoIntro} aria-label={`${BRAND_LEGAL_NAME} ${hubLabel}`}>
        <h1 className={styles.seoTitle}>{copy.title}</h1>
        <p className={styles.seoDesc}>{copy.description}</p>
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
              {isZh ? item.nameZh : item.nameEn}
            </a>
          ))}
        </nav>
      </section>
    </>
  );
}
