import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: 'Debug API',
  path: '/debug-api',
  noIndex: true,
});

export default function DebugApiLayout({ children }) {
  return children;
}
