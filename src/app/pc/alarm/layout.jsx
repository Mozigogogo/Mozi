import { cookies } from 'next/headers';
import { buildPageMetadata } from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getAlarmSeoCopy, hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
  const symbol = String(searchParams?.symbol || '').trim().toUpperCase();
  const { title, description } = getAlarmSeoCopy(symbol || null, lng);
  const path = symbol
    ? `/pc/alarm?symbol=${encodeURIComponent(symbol)}`
    : '/pc/alarm';

  return buildPageMetadata({
    title,
    description,
    path,
    lng,
    // 允许收录：勿再被 robots.txt disallow + meta noindex 双重屏蔽
    noIndex: false,
    keywords: [
      '价格预警',
      '价格告警',
      '加密货币告警',
      '行情提醒',
      'BTC预警',
      'price alert',
      'crypto alert',
      'MoziInnovations',
      'Mozi',
      '墨子',
      symbol,
    ].filter(Boolean),
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
}

export default function PcAlarmLayout({ children }) {
  return children;
}
