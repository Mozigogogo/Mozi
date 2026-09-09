import PCCommunityContent from '@/components/PCCommunityContent';
import { buildPageMetadata, COMMUNITY_KEYWORDS } from '@/utils/seoConfig';
import {
  getCommunityTabSeoDescription,
  getCommunityTabSeoTitle,
  normalizeCommunityTab,
} from '@/utils/communityNavigation';

export async function generateMetadata({ searchParams }) {
  const tab = normalizeCommunityTab(searchParams?.tab);
  const path =
    tab === 'all'
      ? '/pc/community'
      : `/pc/community?tab=${encodeURIComponent(tab)}`;

  return buildPageMetadata({
    title: getCommunityTabSeoTitle(tab),
    description: getCommunityTabSeoDescription(tab),
    path,
    keywords: COMMUNITY_KEYWORDS,
  });
}

export default function PCCommunityPage() {
  return <PCCommunityContent />;
}
