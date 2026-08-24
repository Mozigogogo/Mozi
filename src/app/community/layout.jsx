import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: '社区',
  description: '墨子社区：币圈话题讨论、热榜与用户观点交流。',
  path: '/community',
});

export default function CommunityLayout({ children }) {
  return children;
}
