import { cookies } from 'next/headers';
import { buildPageMetadata } from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getAboutSeoCopy, seoLngFromCookieValue } from '@/utils/seoI18n';

export async function generateMetadata() {
  const lng = seoLngFromCookieValue(cookies().get(I18N_COOKIE_KEY)?.value);
  const { title, description } = getAboutSeoCopy(lng);

  return buildPageMetadata({
    title,
    description,
    path: '/pc/about',
    keywords: [
      '关于我们',
      'About',
      'MoziInnovations',
      '墨子',
      'Mozi',
      'AI预测',
      '加密货币数据分析',
      '量化策略',
      'moziai.xyz',
    ],
  });
}

export default function PCAboutLayout({ children }) {
  return children;
}
