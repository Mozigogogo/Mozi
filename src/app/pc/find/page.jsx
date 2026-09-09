import PCFindContent from '@/components/PCFindContent';
import { buildPageMetadata } from '@/utils/seoConfig';
import {
  getFindTabSeoDescription,
  getFindTabSeoTitle,
  normalizePcFindTab,
} from '@/utils/pcFindNavigation';

export async function generateMetadata({ searchParams }) {
  const tab = normalizePcFindTab(searchParams?.tab);
  const path =
    tab === 'market' ? '/pc/find' : `/pc/find?tab=${encodeURIComponent(tab)}`;

  return buildPageMetadata({
    title: getFindTabSeoTitle(tab),
    description: getFindTabSeoDescription(tab),
    path,
    keywords: [
      '数字货币',
      '数字货币价格',
      '加密货币价格',
      '加密货币市值',
      '市值',
      '行情图表',
      '美股行情',
      '排行榜',
      'PC发现',
      'MoziInnovations',
      'Mozi',
      '墨子',
    ],
  });
}

export default function PCFindPage() {
  return <PCFindContent />;
}
