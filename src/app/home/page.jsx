import { headers } from 'next/headers';
import HomeClient from '../HomeClient';
import SiteHubSeo from '@/components/SiteHubSeo';
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
    'Mozi',
    '墨子',
    '首页',
    '行情首页',
    '加密货币行情',
    '热门币种',
    '板块轮动',
    'AI预测',
    'crypto markets',
    'home',
  ],
});

function isProbablyMobile(ua = '') {
  const s = String(ua);
  return /Android|iPhone|iPad|iPod|Mobile/i.test(s);
}

export default function AppHomePage() {
  const ua = headers().get('user-agent') || '';
  const initialIsPC = !isProbablyMobile(ua);
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
