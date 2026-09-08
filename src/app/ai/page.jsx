import SiteHubSeo from '@/components/SiteHubSeo';
import {
  PRIMARY_SITE_HUBS,
  buildPageMetadata,
} from '@/utils/seoConfig';

const aiHub = PRIMARY_SITE_HUBS.find((h) => h.key === 'ai');

export const metadata = buildPageMetadata({
  title: aiHub.title,
  description: aiHub.description,
  path: '/ai',
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
});

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
