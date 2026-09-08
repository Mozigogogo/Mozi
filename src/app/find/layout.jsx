import SiteHubSeo from '@/components/SiteHubSeo';
import {
  PRIMARY_SITE_HUBS,
  buildPageMetadata,
} from '@/utils/seoConfig';

const findHub = PRIMARY_SITE_HUBS.find((h) => h.key === 'find');

export const metadata = buildPageMetadata({
  title: findHub.title,
  description: findHub.description,
  path: '/find',
  keywords: [
    '发现',
    'Discover',
    '涨跌榜',
    '上新公告',
    '下线公告',
    '交易所',
    '加密货币发现',
    'Mozi',
    '墨子',
  ],
});

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
