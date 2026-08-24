import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '发现',
  description: 'PC 发现页：行情榜单、美股与加密市场数据一站查看。',
  path: '/pc/find',
});

export default function PCFindLayout({ children }) {
  return children;
}
