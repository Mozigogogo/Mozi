import { headers } from 'next/headers';
import HomeClient from '../HomeClient';
import SiteHubSeo from '@/components/SiteHubSeo';
import { isProbablyPcUa } from '@/utils/deviceUa';
import {
  PRIMARY_SITE_HUBS,
  buildPageMetadata,
} from '@/utils/seoConfig';

const homeHub = PRIMARY_SITE_HUBS.find((h) => h.key === 'home');

export const metadata = buildPageMetadata({
  title: homeHub.title,
  description: homeHub.description,
  path: '/home',
  keywords: [
    '比特币',
    '比特币行情',
    '比特币价格',
    '加密货币',
    '加密货币行情',
    '加密货币数据分析',
    'BTC',
    'ETH',
    '热门币种',
    '板块轮动',
    'AI预测',
    '量化策略',
    'MoziInnovations',
    'Mozi',
    '墨子',
    'crypto markets',
    'bitcoin price',
  ],
});

export default function AppHomePage() {
  const ua = headers().get('user-agent') || '';
  const initialIsPC = isProbablyPcUa(ua);
  return (
    <>
      <SiteHubSeo
        hubKey="home"
        extraListItems={[
          '热门币种与实时涨跌榜',
          '板块轮动与市场分布',
          'AI 预测与量化策略助手入口',
          '套利雷达与智能价格预警',
        ]}
      />
      <HomeClient initialIsPC={initialIsPC} />
    </>
  );
}
