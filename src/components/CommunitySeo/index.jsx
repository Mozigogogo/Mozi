import {
  BRAND_LEGAL_NAME,
  COMMUNITY_DESCRIPTION,
  COMMUNITY_PC_DESCRIPTION,
  COMMUNITY_PC_TITLE,
  COMMUNITY_TITLE,
  buildCommunityJsonLd,
} from '@/utils/seoConfig';
import styles from './CommunitySeo.module.css';

/**
 * 服务端可抓取 SEO 块：JSON-LD + 正文摘要（页面主体为 client SPA）
 */
export default function CommunitySeo({ variant = 'mobile' }) {
  const isPc = variant === 'pc';
  const path = isPc ? '/pc/community' : '/community';
  const title = isPc ? COMMUNITY_PC_TITLE : COMMUNITY_TITLE;
  const description = isPc ? COMMUNITY_PC_DESCRIPTION : COMMUNITY_DESCRIPTION;
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
