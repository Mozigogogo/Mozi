import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '社区',
  description: 'PC 社区：浏览帖子、热榜话题与市场讨论。',
  path: '/pc/community',
});

export default function PCCommunityLayout({ children }) {
  return children;
}
