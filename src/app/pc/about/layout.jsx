import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '关于我们',
  description: '了解墨子 Mozi：加密数据分析平台，整合行情、榜单与社区能力。',
  path: '/pc/about',
});

export default function PCAboutLayout({ children }) {
  return children;
}
