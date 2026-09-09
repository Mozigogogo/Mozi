import SiteHubSeo from '@/components/SiteHubSeo';

/**
 * PC 发现页布局壳；title / description 由 page.jsx generateMetadata 提供
 *（layout 拿不到可靠的 searchParams，且客户端切 Tab 另有 document.title 同步）
 */
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
