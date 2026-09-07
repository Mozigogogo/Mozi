import CommunitySeo from '@/components/CommunitySeo';
import {
  COMMUNITY_KEYWORDS,
  COMMUNITY_PC_DESCRIPTION,
  COMMUNITY_PC_TITLE,
  buildPageMetadata,
} from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: COMMUNITY_PC_TITLE,
  description: COMMUNITY_PC_DESCRIPTION,
  path: '/pc/community',
  keywords: COMMUNITY_KEYWORDS,
});

export default function PCCommunityLayout({ children }) {
  return (
    <>
      <CommunitySeo variant="pc" />
      {children}
    </>
  );
}
