import { cookies } from 'next/headers';
import CommunitySeo from '@/components/CommunitySeo';
import SiteHubSeo from '@/components/SiteHubSeo';
import { COMMUNITY_KEYWORDS, buildPageMetadata } from '@/utils/seoConfig';
import {
  getCommunityTabSeoDescription,
  getCommunityTabSeoTitle,
  normalizeCommunityTab,
} from '@/utils/communityNavigation';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { seoLngFromCookieValue } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = seoLngFromCookieValue(cookies().get(I18N_COOKIE_KEY)?.value);
  const tab = normalizeCommunityTab(searchParams?.tab);
  const path =
    tab === 'all' ? '/community' : `/community?tab=${encodeURIComponent(tab)}`;

  return buildPageMetadata({
    title: getCommunityTabSeoTitle(tab, lng),
    description: getCommunityTabSeoDescription(tab, lng),
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
