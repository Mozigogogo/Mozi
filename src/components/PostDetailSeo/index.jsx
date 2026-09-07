import {
  BRAND_LEGAL_NAME,
  buildPostJsonLd,
  plainTextExcerpt,
} from '@/utils/seoConfig';
import styles from './PostDetailSeo.module.css';

/**
 * 帖子详情服务端 SEO：JSON-LD + 可抓取正文摘要
 */
export default function PostDetailSeo({ post, postId }) {
  if (!post && !postId) return null;

  const { article, breadcrumb, title, description } = buildPostJsonLd(post || {}, postId);
  const author =
    String(post?.nickName || '').trim() || BRAND_LEGAL_NAME;
  const body = plainTextExcerpt(post?.content, 4000);
  const topics = Array.isArray(post?.topics)
    ? post.topics.map((t) => t?.name).filter(Boolean)
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <article className={styles.seoArticle} aria-label="post seo">
        <header>
          <h1 className={styles.seoTitle}>{title}</h1>
          <p className={styles.seoMeta}>
            {author}
            {post?.createdAt ? ` · ${String(post.createdAt).replace('T', ' ')}` : ''}
            {post?.category ? ` · ${post.category}` : ''}
          </p>
        </header>
        {description ? <p className={styles.seoDesc}>{description}</p> : null}
        {body ? <p className={styles.seoBody}>{body}</p> : null}
        {topics.length > 0 ? (
          <p className={styles.seoTopics}>话题：{topics.map((n) => `#${n}`).join(' ')}</p>
        ) : null}
        <p className={styles.seoBrand}>
          {BRAND_LEGAL_NAME}（Mozi / 墨子）加密货币社区帖子
        </p>
      </article>
    </>
  );
}
