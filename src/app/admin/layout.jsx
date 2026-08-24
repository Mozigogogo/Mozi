import { buildPageMetadata } from '@/utils/seoConfig';
import AdminRootLayoutClient from './AdminRootLayoutClient';

export const metadata = buildPageMetadata({
  title: '后台管理',
  path: '/admin',
  noIndex: true,
});

export default function AdminRootLayout({ children }) {
  return <AdminRootLayoutClient>{children}</AdminRootLayoutClient>;
}
