import {
  BRAND_LEGAL_NAME,
  buildPageMetadata,
} from '@/utils/seoConfig';

export const metadata = buildPageMetadata({
  title: `我的 | ${BRAND_LEGAL_NAME}`,
  description: `${BRAND_LEGAL_NAME} 个人中心（登录后可见），不对外开放收录。`,
  path: '/me',
  noIndex: true,
  keywords: [BRAND_LEGAL_NAME, 'Mozi', '墨子'],
});

export default function MeLayout({ children }) {
  return children;
}
