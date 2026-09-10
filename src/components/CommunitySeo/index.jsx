import { cookies, headers } from 'next/headers';
import {
  BRAND_LEGAL_NAME,
  buildCommunityJsonLd,
} from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import {
  getHubSeoCopy,
  resolveRequestSeoLng,
  resolveSeoLng,
} from '@/utils/seoI18n';
import { buildCommunityTabHref } from '@/utils/communityNavigation';
import styles from './CommunitySeo.module.css';

/**
 * 服务端可抓取 SEO 块：JSON-LD + 正文摘要（页面主体为 client SPA）
 * Tab 互链仅 PC；移动端不做 SEO Tab 优化
 */
export default function CommunitySeo({ variant = 'mobile' }) {
  const isPc = variant === 'pc';
  const path = isPc ? '/pc/community' : '/community';
  const lng = resolveRequestSeoLng({
    cookieValue:
      headers().get('x-mozi-seo-lng') || cookies().get(I18N_COOKIE_KEY)?.value,
  });
  const isZh = resolveSeoLng(lng) === 'zh';
  const { title, description } = getHubSeoCopy('community', lng);
  const { collectionPage, breadcrumb } = buildCommunityJsonLd({
    path,
    name: title,
    description,
  });

  const tabLinks = isPc
    ? [
        { href: buildCommunityTabHref(path, 'all'), label: isZh ? '全部' : 'All' },
        { href: buildCommunityTabHref(path, 'coin'), label: isZh ? '币种' : 'Coins' },
        {
          href: buildCommunityTabHref(path, 'discover'),
          label: isZh ? '发现好币' : 'Discover',
        },
        { href: buildCommunityTabHref(path, 'qa'), label: isZh ? '不懂就问' : 'Q&A' },
      ]
    : [];

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
      <section className={styles.seoIntro} aria-label={`${BRAND_LEGAL_NAME} community`}>
        <h1 className={styles.seoTitle}>{title}</h1>
        <p className={styles.seoDesc}>{description}</p>
        <ul className={styles.seoList}>
          <li>热门话题与精选推荐帖子</li>
          <li>BTC / ETH 等主流币种讨论</li>
          <li>不懂就问、发现好币与行情观点交流</li>
          <li>
            {BRAND_LEGAL_NAME}（Mozi / 墨子）加密数据智能社区
          </li>
        </ul>
        {tabLinks.length > 0 ? (
          <nav className={styles.seoNav} aria-label="community tabs">
            {tabLinks.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </section>
    </>
  );
}
