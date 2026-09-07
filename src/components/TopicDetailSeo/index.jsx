import {
  BRAND_LEGAL_NAME,
  buildTopicJsonLd,
  plainTextExcerpt,
} from '@/utils/seoConfig';
import styles from './TopicDetailSeo.module.css';

/**
 * 话题详情服务端 SEO：JSON-LD + 可抓取摘要
 */
export default function TopicDetailSeo({ topic, topicId, queryFallback }) {
  if (!topic && !topicId) return null;

  const { collectionPage, breadcrumb, title, description } = buildTopicJsonLd(
    topic || {},
    topicId,
    queryFallback
  );

  const descBody =
    plainTextExcerpt(topic?.description || queryFallback?.description, 2000) ||
    description;

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
      <article className={styles.seoArticle} aria-label="topic seo">
        <header>
          <h1 className={styles.seoTitle}>{title}</h1>
          <p className={styles.seoMeta}>
            {topic?.createdAt
              ? String(topic.createdAt).replace('T', ' ')
              : null}
            {topic?.likeCnt != null ? ` · ${topic.likeCnt} likes` : null}
            {topic?.commentCnt != null ? ` · ${topic.commentCnt} comments` : null}
          </p>
        </header>
        {descBody ? <p className={styles.seoDesc}>{descBody}</p> : null}
        <p className={styles.seoBrand}>
          {BRAND_LEGAL_NAME}（Mozi / 墨子）加密货币社区话题
        </p>
      </article>
    </>
  );
}
