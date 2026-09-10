import { cookies } from 'next/headers';
import { buildPageMetadata } from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getHelpSeoCopy, hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
  const { title, description } = getHelpSeoCopy(lng);

  return buildPageMetadata({
    title,
    description,
    path: '/pc/help',
    lng,
    keywords: [
      '帮助中心',
      '常见问题',
      '使用指南',
      'FAQ',
      'Help Center',
      '加密货币帮助',
      'MoziInnovations',
      'Mozi',
      '墨子',
    ],
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
}

export default function PCHelpLayout({ children }) {
  return children;
}
