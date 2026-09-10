import { cookies } from 'next/headers';
import { buildPageMetadata } from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getAchievementSeoCopy, hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
  const { title, description } = getAchievementSeoCopy(lng);

  return buildPageMetadata({
    title,
    description,
    path: '/achievement',
    lng,
    // 允许搜索引擎收录（GSC：曾因 meta robots noindex 被排除）
    noIndex: false,
    keywords: [
      '积分',
      '积分任务',
      '赚积分',
      '积分中心',
      '成就中心',
      '加密货币积分',
      '积分池',
      '积分排行榜',
      '邀请奖励',
      'points',
      'crypto points',
      'achievement',
      'MoziInnovations',
      'Mozi',
      '墨子',
    ],
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
}

export default function AchievementLayout({ children }) {
  return children;
}
