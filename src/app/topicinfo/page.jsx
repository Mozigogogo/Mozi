import { Suspense } from 'react';
import TopicDetailSeo from '@/components/TopicDetailSeo';
import { fetchTopicDetailServer } from '@/utils/fetchTopicDetailServer';
import {
  BRAND_LEGAL_NAME,
  buildPageMetadata,
  buildTopicJsonLd,
  plainTextExcerpt,
} from '@/utils/seoConfig';
import { hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';
import TopicInfoClient from './TopicInfoClient';

function resolveTopicId(searchParams) {
  return String(searchParams?.id || searchParams?.topicId || '').trim();
}

function resolveQueryFallback(searchParams) {
  return {
    title: String(searchParams?.title || '').trim(),
    description: String(searchParams?.description || '').trim(),
  };
}

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({ searchParams });
  const topicId = resolveTopicId(searchParams);
  const queryFallback = resolveQueryFallback(searchParams);

  if (!topicId) {
    return buildPageMetadata({
      title: `话题详情 | ${BRAND_LEGAL_NAME}（Mozi / 墨子）`,
      description: `${BRAND_LEGAL_NAME}（Mozi / 墨子）加密货币社区话题：热门讨论、行情观点与相关帖子。`,
      path: '/topicinfo',
      lng,
      keywords: [BRAND_LEGAL_NAME, 'Mozi', '墨子', '加密货币社区', '热门话题'],
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
  }

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

export default async function TopicInfoPage({ searchParams }) {
  const topicId = resolveTopicId(searchParams);
  const queryFallback = resolveQueryFallback(searchParams);
  const topic = topicId ? await fetchTopicDetailServer(topicId) : null;

  return (
    <>
      {topicId ? (
        <TopicDetailSeo
          topic={topic}
          topicId={topicId}
          queryFallback={queryFallback}
        />
      ) : null}
      <Suspense fallback={null}>
        <TopicInfoClient />
      </Suspense>
    </>
  );
}
