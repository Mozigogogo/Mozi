import { headers } from 'next/headers';
import HomeClient from '../HomeClient';
import SiteHubSeo from '@/components/SiteHubSeo';
import { isProbablyPcUa } from '@/utils/deviceUa';
import { buildPageMetadata } from '@/utils/seoConfig';
import {
  getHubSeoCopy,
  resolveSeoLng,
  seoLngFromSearchParams,
  withSeoLng,
} from '@/utils/seoI18n';

const HOME_KEYWORDS = [
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
];

/**
 * /home 双语 SEO：
 * - 中文：/home?lng=zh（无 lng 时也按中文出，canonical 归到 ?lng=zh）
 * - 英文：/home?lng=en
 * sitemap + hreflang 同时声明两套，便于中英文各自收录。
 */
function resolveHomeSeoLng(searchParams) {
  return resolveSeoLng(seoLngFromSearchParams(searchParams) || 'zh');
}

export async function generateMetadata({ searchParams }) {
  const lng = resolveHomeSeoLng(searchParams);
  const homeSeo = getHubSeoCopy('home', lng);
  return buildPageMetadata({
    title: homeSeo.title,
    description: homeSeo.description,
    path: withSeoLng('/home', lng),
    lng,
    keywords: HOME_KEYWORDS,
    // 中英各有独立 canonical，避免挤成单一语言
    lngInCanonical: true,
  });
}

export default function AppHomePage({ searchParams }) {
  const ua = headers().get('user-agent') || '';
  const initialIsPC = isProbablyPcUa(ua);
  const hubLng = resolveHomeSeoLng(searchParams);
  const isZh = hubLng === 'zh';

  return (
    <>
      <SiteHubSeo
        hubKey="home"
        lng={hubLng}
        pathOverride={withSeoLng('/home', hubLng)}
        extraListItems={
          isZh
            ? [
                '热门币种与实时涨跌榜',
                '板块轮动与市场分布',
                'AI 预测与量化策略助手入口',
                '套利雷达与智能价格预警',
              ]
            : [
                'Top coins and live gainers / losers',
                'Sector rotation and market distribution',
                'AI prediction and quant strategy assistant',
                'Arbitrage radar and smart price alerts',
              ]
        }
      />
      <HomeClient initialIsPC={initialIsPC} />
    </>
  );
}
