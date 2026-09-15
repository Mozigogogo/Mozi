import { Suspense } from 'react';
import { cookies } from 'next/headers';
import PCCommunityContent from '@/components/PCCommunityContent';
import PostDetailSeo from '@/components/PostDetailSeo';
import TopicDetailSeo from '@/components/TopicDetailSeo';
import { fetchPostDetailServer } from '@/utils/fetchPostDetailServer';
import { fetchTopicDetailServer } from '@/utils/fetchTopicDetailServer';
import {
  BRAND_LEGAL_NAME,
  buildPageMetadata,
  buildPostJsonLd,
  buildTopicJsonLd,
  COMMUNITY_KEYWORDS,
  plainTextExcerpt,
} from '@/utils/seoConfig';
import {
  getCommunityTabSeoDescription,
  getCommunityTabSeoTitle,
  normalizeCommunityTab,
} from '@/utils/communityNavigation';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

function resolveTopicId(searchParams) {
  return String(searchParams?.topicId || '').trim();
}

function resolvePostId(searchParams) {
  return String(searchParams?.postId || '').trim();
}

function resolveQueryFallback(searchParams) {
  return {
    title: String(searchParams?.title || '').trim(),
    description: String(searchParams?.description || '').trim(),
  };
}

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
  const topicId = resolveTopicId(searchParams);
  const postId = resolvePostId(searchParams);
  const queryFallback = resolveQueryFallback(searchParams);

  // 帖子深链优先于话题（与弹窗打开帖子详情一致）
  if (postId) {
    const post = await fetchPostDetailServer(postId);
    const { title, description, path, keywords } = buildPostJsonLd(post || {}, postId);
    const pageTitle = `${plainTextExcerpt(title, 70)} | ${BRAND_LEGAL_NAME}`;
    return buildPageMetadata({
      title: pageTitle,
      description,
      path,
      lng,
      keywords,
      image: Array.isArray(post?.images) && post.images[0] ? post.images[0] : undefined,
      type: 'article',
      lngInCanonical: false,
      hreflang: false,
    });
  }

  if (topicId) {
    const topic = await fetchTopicDetailServer(topicId);
    const { title, description, path, keywords } = buildTopicJsonLd(
      topic || {},
      topicId,
      queryFallback
    );
    const pageTitle = `${plainTextExcerpt(title, 70)} | ${BRAND_LEGAL_NAME}`;

    return buildPageMetadata({
      title: pageTitle,
      description,
      path,
      lng,
      keywords,
      lngInCanonical: hasExplicitSeoLng(searchParams),
    });
  }

  const tab = normalizeCommunityTab(searchParams?.tab);
  const path =
    tab === 'all'
      ? '/pc/community'
      : `/pc/community?tab=${encodeURIComponent(tab)}`;

  return buildPageMetadata({
    title: getCommunityTabSeoTitle(tab, lng),
    description: getCommunityTabSeoDescription(tab, lng),
    path,
    lng,
    keywords: COMMUNITY_KEYWORDS,
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
}

export default async function PCCommunityPage({ searchParams }) {
  const topicId = resolveTopicId(searchParams);
  const postId = resolvePostId(searchParams);
  const queryFallback = resolveQueryFallback(searchParams);
  const topic = topicId ? await fetchTopicDetailServer(topicId) : null;
  const post = postId ? await fetchPostDetailServer(postId) : null;

  return (
    <>
      {postId ? <PostDetailSeo post={post} postId={postId} /> : null}
      {!postId && topicId ? (
        <TopicDetailSeo
          topic={topic}
          topicId={topicId}
          queryFallback={queryFallback}
        />
      ) : null}
      <Suspense fallback={null}>
        <PCCommunityContent />
      </Suspense>
    </>
  );
}
