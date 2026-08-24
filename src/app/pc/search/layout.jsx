import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '搜索',
  description: '搜索加密货币或美股标的。',
  path: '/pc/search',
  noIndex: true,
});

export default function PCSearchLayout({ children }) {
  return children;
}
