import { cookies } from 'next/headers';
import {
  BRAND_LEGAL_NAME,
  buildCommunityJsonLd,
} from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getHubSeoCopy, seoLngFromCookieValue } from '@/utils/seoI18n';
import styles from './CommunitySeo.module.css';

/**
 * 服务端可抓取 SEO 块：JSON-LD + 正文摘要（页面主体为 client SPA）
 */
export default function CommunitySeo({ variant = 'mobile' }) {
  const isPc = variant === 'pc';
  const path = isPc ? '/pc/community' : '/community';
  const lng = seoLngFromCookieValue(cookies().get(I18N_COOKIE_KEY)?.value);
  const { title, description } = getHubSeoCopy('community', lng);
  const { collectionPage, breadcrumb } = buildCommunityJsonLd({
    path,
    name: title,
    description,
  });

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
      </section>
    </>
  );
}
