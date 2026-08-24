import { headers } from 'next/headers';
import HomeClient from '../HomeClient';
import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '行情首页',
  description: '墨子行情首页：热门币种、涨跌榜、板块与市场概览，实时跟踪加密市场动态。',
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

