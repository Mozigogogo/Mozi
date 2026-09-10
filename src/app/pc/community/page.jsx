import { cookies } from 'next/headers';
import PCCommunityContent from '@/components/PCCommunityContent';
import { buildPageMetadata, COMMUNITY_KEYWORDS } from '@/utils/seoConfig';
import {
  getCommunityTabSeoDescription,
  getCommunityTabSeoTitle,
  normalizeCommunityTab,
} from '@/utils/communityNavigation';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
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

export default function PCCommunityPage() {
  return <PCCommunityContent />;
}
