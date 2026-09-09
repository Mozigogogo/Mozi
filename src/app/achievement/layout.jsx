import { cookies } from 'next/headers';
import { buildPageMetadata } from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getAchievementSeoCopy, seoLngFromCookieValue } from '@/utils/seoI18n';

export async function generateMetadata() {
  const lng = seoLngFromCookieValue(cookies().get(I18N_COOKIE_KEY)?.value);
  const { title, description } = getAchievementSeoCopy(lng);

  return buildPageMetadata({
    title,
    description,
    path: '/achievement',
    noIndex: true,
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
  });
}

export default function AchievementLayout({ children }) {
  return children;
}
