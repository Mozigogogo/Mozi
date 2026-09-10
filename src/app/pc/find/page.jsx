import { cookies } from 'next/headers';
import PCFindContent from '@/components/PCFindContent';
import { buildPageMetadata } from '@/utils/seoConfig';
import {
  getFindTabSeoDescription,
  getFindTabSeoTitle,
  normalizePcFindTab,
} from '@/utils/pcFindNavigation';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
  const tab = normalizePcFindTab(searchParams?.tab);
  const path =
    tab === 'market' ? '/pc/find' : `/pc/find?tab=${encodeURIComponent(tab)}`;

  return buildPageMetadata({
    title: getFindTabSeoTitle(tab, lng),
    description: getFindTabSeoDescription(tab, lng),
    path,
    lng,
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
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
}

export default function PCFindPage() {
  return <PCFindContent />;
}
