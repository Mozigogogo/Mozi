import { headers } from 'next/headers';
import HomeClient from '../HomeClient';
import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: 'Markets Home | MoziInnovations',
  description:
    'MoziInnovations (Mozi) markets home: trending coins, gainers & losers, sectors and market overview in real time. 墨子行情首页：热门币种、涨跌榜与板块概览。',
  path: '/home',
});

function isProbablyMobile(ua = '') {
  const s = String(ua);
  return /Android|iPhone|iPad|iPod|Mobile/i.test(s);
}

export default function AppHomePage() {
  const ua = headers().get('user-agent') || '';
  const initialIsPC = !isProbablyMobile(ua);
  return <HomeClient initialIsPC={initialIsPC} />;
}

