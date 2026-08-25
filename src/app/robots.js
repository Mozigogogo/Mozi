import { SITE_URL } from '@/utils/seoConfig';

/**
 * https://moziai.xyz/robots.txt
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/auth',
          '/auth/',
          '/api/',
          '/debug-api',
          '/test-api',
          '/pc/search',
          '/pc/us-stock-search',
          '/search',
          '/kyc',
          '/mint',
          '/withdrawhistory',
          '/pointshistory',
          '/mynotices',
          '/mywarn',
          '/mylikes',
          '/mycomments',
          '/addwarn',
          '/wechat-alert',
          '/pc/alarm',
          '/pc/benefits',
          '/pc/benefitsPage',
          '/vip-recharge',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
