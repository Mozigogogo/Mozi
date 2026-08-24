import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '发现',
  description: '发现加密市场热门币种、涨跌榜、板块与交易所数据，快速定位交易机会。',
  path: '/find',
});

export default function FindLayout({ children }) {
  return children;
}
