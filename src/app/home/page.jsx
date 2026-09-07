import { headers } from 'next/headers';
import HomeClient from '../HomeClient';
import MarketsHomeSeo from '@/components/MarketsHomeSeo';
import {
  BRAND_LEGAL_NAME,
  buildPageMetadata,
} from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: `Markets Home | ${BRAND_LEGAL_NAME}（Mozi / 墨子）`,
  description: `${BRAND_LEGAL_NAME}（Mozi / 墨子）行情首页：AI 驱动的加密货币数据分析、热门币种、板块轮动与量化策略洞察。Crypto markets home with trending coins, sectors and quant strategy insights.`,
  path: '/home',
  keywords: [
    BRAND_LEGAL_NAME,
    'Mozi',
    '墨子',
    '加密货币行情',
    '行情首页',
    '热门币种',
    '板块轮动',
    'AI预测',
    'crypto markets',
    'trending coins',
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
      <MarketsHomeSeo />
      <HomeClient initialIsPC={initialIsPC} />
    </>
  );
}
