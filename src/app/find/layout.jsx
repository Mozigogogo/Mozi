import { cookies } from 'next/headers';
import SiteHubSeo from '@/components/SiteHubSeo';
import { buildPageMetadata } from '@/utils/seoConfig';
import {
  getFindTabSeoDescription,
  getFindTabSeoTitle,
  normalizePcFindTab,
} from '@/utils/pcFindNavigation';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { seoLngFromCookieValue } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = seoLngFromCookieValue(cookies().get(I18N_COOKIE_KEY)?.value);
  const tab = normalizePcFindTab(searchParams?.tab);
  const path = tab === 'market' ? '/find' : `/find?tab=${encodeURIComponent(tab)}`;

  return buildPageMetadata({
    title: getFindTabSeoTitle(tab, lng),
    description: getFindTabSeoDescription(tab, lng),
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
      '涨跌榜',
      'BTC',
      'ETH',
      'MoziInnovations',
      'Mozi',
      '墨子',
    ],
  });
}

export default function FindLayout({ children }) {
  return (
    <>
      <SiteHubSeo
        hubKey="find"
        extraListItems={[
          '涨跌榜与热门币种',
          '板块与交易所数据',
          '上新 / 已上线 / 下线公告日历',
          '快速定位交易机会',
        ]}
      />
      {children}
    </>
  );
}
