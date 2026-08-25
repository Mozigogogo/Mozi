import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: 'About MoziInnovations (Mozi / 墨子)',
  description:
    'About MoziInnovations (Mozi / moz / 墨子): a crypto data intelligence platform for real-time markets, rankings, AI insights and community. Official site moziai.xyz. 了解墨子加密数据分析平台。',
  path: '/pc/about',
});

export default function PCAboutLayout({ children }) {
  return children;
}
