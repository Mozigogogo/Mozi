import { cookies } from 'next/headers';
import { buildPageMetadata } from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getSubscribeSeoCopy, hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
  const { title, description } = getSubscribeSeoCopy(lng);

  return buildPageMetadata({
    title,
    description,
    path: '/subscribe',
    lng,
    keywords: [
      '会员订阅',
      'VIP',
      '加密货币会员',
      'VIP权益',
      'AI分析',
      '实时行情',
      '价格预警',
      'membership',
      'crypto VIP',
      'subscribe',
      'MoziInnovations',
      'Mozi',
      '墨子',
    ],
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
}

export default function SubscribeLayout({ children }) {
  return children;
}
