import { cookies } from 'next/headers';
import SiteHubSeo from '@/components/SiteHubSeo';
import { buildPageMetadata } from '@/utils/seoConfig';
import { I18N_COOKIE_KEY } from '@/i18n/languageStorage';
import { getHubSeoCopy, hasExplicitSeoLng, resolveRequestSeoLng } from '@/utils/seoI18n';

export async function generateMetadata({ searchParams }) {
  const lng = resolveRequestSeoLng({
    cookieValue: cookies().get(I18N_COOKIE_KEY)?.value,
    searchParams,
  });
  const aiSeo = getHubSeoCopy('ai', lng);
  return buildPageMetadata({
    title: aiSeo.title,
    description: aiSeo.description,
    path: '/ai',
    lng,
    keywords: [
      'AI分析',
      'AI Analysis',
      'AI预测',
      '量化策略',
      '自然语言分析',
      'Mozi',
      '墨子',
      'AI Trade Radar',
    ],
    lngInCanonical: hasExplicitSeoLng(searchParams),
  });
}

export default function AiPage() {
  return (
    <SiteHubSeo
      hubKey="ai"
      extraListItems={[
        '自然语言解读加密行情',
        '板块轮动与套利机会分析',
        '量化策略建议与问答',
        'AI Trade Radar',
      ]}
    />
  );
}
