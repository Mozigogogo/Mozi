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
          '/pc/benefits',
          '/pc/benefitsPage',
          '/vip-recharge',
          '/me',
          '/commentinfo',
          '/commentinfo/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // 不写 Host：Host 仅为 Yandex 指令，Googlebot 会忽略并在 GSC 报黄
  };
}
