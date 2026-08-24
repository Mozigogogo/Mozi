import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '热门板块',
  description: '热门加密板块涨跌与资金动向，快速发现市场主线。',
  path: '/hotsector',
});

export default function HotSectorLayout({ children }) {
  return children;
}
