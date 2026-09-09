import CommunitySeo from '@/components/CommunitySeo';
import SiteHubSeo from '@/components/SiteHubSeo';

/**
 * title 由 page.jsx generateMetadata 提供；客户端切 Tab 另有 document.title 同步
 */
export default function PCCommunityLayout({ children }) {
  return (
    <>
      <CommunitySeo variant="pc" />
      <SiteHubSeo
        hubKey="community"
        pathOverride="/pc/community"
        includeNavSchema={false}
      />
      {children}
    </>
  );
}
