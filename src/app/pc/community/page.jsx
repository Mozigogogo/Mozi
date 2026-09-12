import { Suspense } from 'react';
import { cookies } from 'next/headers';
import PCCommunityContent from '@/components/PCCommunityContent';
import TopicDetailSeo from '@/components/TopicDetailSeo';
import { fetchTopicDetailServer } from '@/utils/fetchTopicDetailServer';
import {
  BRAND_LEGAL_NAME,
  buildPageMetadata,
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
  return String(searchParams?.topicId || searchParams?.id || '').trim();
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
  const queryFallback = resolveQueryFallback(searchParams);

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
        <PCCommunityContent />
      </Suspense>
    </>
  );
}
