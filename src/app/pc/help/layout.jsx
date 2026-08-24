import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '帮助中心',
  description: '墨子帮助中心：功能说明、常见问题与使用指南。',
  path: '/pc/help',
});

export default function PCHelpLayout({ children }) {
  return children;
}
