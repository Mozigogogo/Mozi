import CommunitySeo from '@/components/CommunitySeo';
import SiteHubSeo from '@/components/SiteHubSeo';
import { COMMUNITY_KEYWORDS, buildPageMetadata } from '@/utils/seoConfig';
import {
  getCommunityTabSeoDescription,
  getCommunityTabSeoTitle,
  normalizeCommunityTab,
} from '@/utils/communityNavigation';

export async function generateMetadata({ searchParams }) {
  const tab = normalizeCommunityTab(searchParams?.tab);
  const path =
    tab === 'all' ? '/community' : `/community?tab=${encodeURIComponent(tab)}`;

  return buildPageMetadata({
    title: getCommunityTabSeoTitle(tab),
    description: getCommunityTabSeoDescription(tab),
    path,
    keywords: COMMUNITY_KEYWORDS,
  });
}

export default function CommunityLayout({ children }) {
  return (
    <>
      <CommunitySeo variant="mobile" />
      <SiteHubSeo hubKey="community" />
      {children}
    </>
  );
}
