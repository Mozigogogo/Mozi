import { Suspense } from 'react';
import PostDetailSeo from '@/components/PostDetailSeo';
import { fetchPostDetailServer } from '@/utils/fetchPostDetailServer';
import {
  BRAND_LEGAL_NAME,
  buildPageMetadata,
  buildPostJsonLd,
  plainTextExcerpt,
} from '@/utils/seoConfig';
import CommentInfoClient from './CommentInfoClient';

function resolvePostId(searchParams) {
  return String(searchParams?.id || '').trim();
}

export async function generateMetadata({ searchParams }) {
  const postId = resolvePostId(searchParams);

  if (!postId) {
    return buildPageMetadata({
      title: `帖子详情 | ${BRAND_LEGAL_NAME}（Mozi / 墨子）`,
      description: `${BRAND_LEGAL_NAME} 加密货币社区帖子详情：讨论行情、话题与交易观点。`,
      path: '/commentinfo',
      keywords: [BRAND_LEGAL_NAME, 'Mozi', '墨子', '加密货币社区', '帖子'],
    });
  }

  const post = await fetchPostDetailServer(postId);
  if (!post) {
    return buildPageMetadata({
      title: `帖子详情 | ${BRAND_LEGAL_NAME}`,
      description: `${BRAND_LEGAL_NAME} 加密货币社区帖子。`,
      path: `/commentinfo?id=${encodeURIComponent(postId)}`,
      keywords: [BRAND_LEGAL_NAME, 'Mozi', '墨子', '加密货币社区'],
    });
  }

  const { title, description, path, keywords } = buildPostJsonLd(post, postId);
  const pageTitle = `${plainTextExcerpt(title, 70)} | ${BRAND_LEGAL_NAME}`;

  return buildPageMetadata({
    title: pageTitle,
    description,
    path,
    keywords,
    image: Array.isArray(post.images) && post.images[0] ? post.images[0] : undefined,
    type: 'article',
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
