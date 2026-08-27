import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: 'About MoziInnovations (Mozi / 墨子)',
  description:
    'About MoziInnovations (Mozi / moz / 墨子): AI market prediction, quant strategy assistant and crypto data analytics platform. Official site moziai.xyz. 了解墨子 AI 预测与加密货币数据分析平台。',
  path: '/pc/about',
});

export default function PCAboutLayout({ children }) {
  return children;
}
