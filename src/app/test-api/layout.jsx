import { buildPageMetadata } from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: 'Test API',
  path: '/test-api',
  noIndex: true,
});

export default function TestApiLayout({ children }) {
  return children;
}
