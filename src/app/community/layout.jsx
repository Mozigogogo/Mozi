import CommunitySeo from '@/components/CommunitySeo';
import {
  COMMUNITY_DESCRIPTION,
  COMMUNITY_KEYWORDS,
  COMMUNITY_TITLE,
  buildPageMetadata,
} from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: COMMUNITY_TITLE,
  description: COMMUNITY_DESCRIPTION,
  path: '/community',
  keywords: COMMUNITY_KEYWORDS,
});

export default function CommunityLayout({ children }) {
  return (
    <>
      <CommunitySeo variant="mobile" />
      {children}
    </>
  );
}
