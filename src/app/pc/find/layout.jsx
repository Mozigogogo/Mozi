import SiteHubSeo from '@/components/SiteHubSeo';
import {
  PRIMARY_SITE_HUBS,
  buildPageMetadata,
} from '@/utils/seoConfig';

const findHub = PRIMARY_SITE_HUBS.find((h) => h.key === 'find');

export const metadata = buildPageMetadata({
  title: `发现（PC） | MoziInnovations（Mozi / 墨子）`,
  description: findHub.description,
  path: '/pc/find',
  keywords: [
    '发现',
    'Discover',
    'PC发现',
    '行情榜单',
    '公告日历',
    'Mozi',
    '墨子',
  ],
});

export default function PCFindLayout({ children }) {
  return (
    <>
      <SiteHubSeo
        hubKey="find"
        pathOverride="/pc/find"
        includeNavSchema={false}
        extraListItems={[
          'PC 端行情榜单与市场数据',
          '上新 / 已上线 / 下线公告',
          '日历筛选与交易所图例',
        ]}
      />
      {children}
    </>
  );
}
