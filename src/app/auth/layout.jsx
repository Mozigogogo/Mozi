import { buildPageMetadata } from '@/utils/seoConfig';
import AuthLayoutClient from './AuthLayoutClient';

export const metadata = buildPageMetadata({
  title: '登录',
  path: '/auth',
  noIndex: true,
});

export default function AuthLayout({ children }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
