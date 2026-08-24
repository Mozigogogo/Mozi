import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '搜索',
  path: '/search',
  noIndex: true,
});

export default function SearchLayout({ children }) {
  return children;
}
