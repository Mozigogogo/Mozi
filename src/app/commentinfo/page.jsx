import { Suspense } from 'react';
import PostDetailSeo from '@/components/PostDetailSeo';
import { fetchPostDetailServer } from '@/utils/fetchPostDetailServer';
import {
  BRAND_LEGAL_NAME,
  buildPageMetadata,
  buildPostJsonLd,
  plainTextExcerpt,
} from '@/utils/seoConfig';
import { resolveRequestSeoLng } from '@/utils/seoI18n';
import CommentInfoClient from './CommentInfoClient';

function resolvePostId(searchParams) {
  return String(searchParams?.id || searchParams?.postId || '').trim();
}

/**
 * 移动端帖子详情：不收录。
 * canonical / JSON-LD 一律指向 PC `/pc/community?postId=`，与 sitemap、robots 一致。
 */
export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({ searchParams });
  const postId = resolvePostId(searchParams);
  const ugcMeta = { lngInCanonical: false, hreflang: false, noIndex: true };

  if (!postId) {
    return buildPageMetadata({
      title:
        lng === 'en'
          ? `Post detail | ${BRAND_LEGAL_NAME}`
          : `帖子详情 | ${BRAND_LEGAL_NAME}（Mozi / 墨子）`,
      description:
        lng === 'en'
          ? `${BRAND_LEGAL_NAME} community post: market discussion, topics and trading views.`
          : `${BRAND_LEGAL_NAME} 加密货币社区帖子详情：讨论行情、话题与交易观点。`,
      path: '/pc/community',
      lng,
      keywords: [BRAND_LEGAL_NAME, 'Mozi', '墨子', '加密货币社区', '帖子'],
      ...ugcMeta,
    });
  }

  const post = await fetchPostDetailServer(postId);
  const path = `/pc/community?postId=${encodeURIComponent(postId)}`;

  if (!post) {
    return buildPageMetadata({
      title:
        lng === 'en'
          ? `Post detail | ${BRAND_LEGAL_NAME}`
          : `帖子详情 | ${BRAND_LEGAL_NAME}`,
      description:
        lng === 'en'
          ? `${BRAND_LEGAL_NAME} crypto community post.`
          : `${BRAND_LEGAL_NAME} 加密货币社区帖子。`,
      path,
      lng,
      keywords: [BRAND_LEGAL_NAME, 'Mozi', '墨子', '加密货币社区'],
      ...ugcMeta,
    });
  }

  const { title, description, keywords } = buildPostJsonLd(post, postId);
  const pageTitle = `${plainTextExcerpt(title, 70)} | ${BRAND_LEGAL_NAME}`;

  return buildPageMetadata({
    title: pageTitle,
    description,
    path,
    lng,
    keywords,
    image: Array.isArray(post.images) && post.images[0] ? post.images[0] : undefined,
    type: 'article',
    ...ugcMeta,
  });
}

export default async function CommentInfoPage({ searchParams }) {
  const postId = resolvePostId(searchParams);
  const post = postId ? await fetchPostDetailServer(postId) : null;

  return (
    <>
      {postId ? <PostDetailSeo post={post} postId={postId} /> : null}
      <Suspense fallback={null}>
        <CommentInfoClient />
      </Suspense>
    </>
  );
}
