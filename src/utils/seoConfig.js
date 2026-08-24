/**
 * 站点 SEO 基础配置（askmozi.com）
 * 可通过 NEXT_PUBLIC_SITE_URL 覆盖正式域名
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://askmozi.com'
).replace(/\/$/, '');

export const SITE_NAME_ZH = '墨子 Mozi';
export const SITE_NAME_EN = 'Mozi';

export const DEFAULT_TITLE = '墨子 Mozi - 数字货币行情与社区';
export const DEFAULT_DESCRIPTION =
  '墨子（Mozi）提供加密货币与美股行情、板块热度、套利雷达、价格预警与社区讨论，帮你更快发现交易机会。';

export const DEFAULT_KEYWORDS = [
  '墨子',
  'Mozi',
  '加密货币',
  '数字货币',
  '行情',
  '比特币',
  'BTC',
  'ETH',
  '美股',
  '板块',
  '套利',
  '价格预警',
  '加密社区',
];

/** CDN / 站内默认分享图 */
export const DEFAULT_OG_IMAGE =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/community/loadding.png';

export function absoluteUrl(path = '/') {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * 组装可复用的 Next.js metadata
 * @param {object} options
 */
export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  type = 'website',
} = {}) {
  const shortTitle = title || DEFAULT_TITLE;
  const alreadyBranded =
    !title ||
    title.includes(SITE_NAME_ZH) ||
    title.includes('Mozi') ||
    title.includes('墨子');
  const pageTitle = alreadyBranded
    ? shortTitle
    : `${shortTitle} | ${SITE_NAME_ZH}`;
  const url = absoluteUrl(path);

  return {
    // 已含品牌名的标题用 absolute，避免被根 layout template 再拼一次
    title: alreadyBranded ? { absolute: pageTitle } : shortTitle,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      locale: 'zh_CN',
      alternateLocale: ['en_US'],
      url,
      siteName: SITE_NAME_ZH,
      title: pageTitle,
      description,
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: SITE_NAME_ZH,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [image],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  };
}

/** 需要被 sitemap 收录的公开静态路由 */
export const PUBLIC_SITEMAP_ROUTES = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/home', changeFrequency: 'hourly', priority: 0.95 },
  { path: '/find', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/pc/find', changeFrequency: 'hourly', priority: 0.85 },
  { path: '/community', changeFrequency: 'hourly', priority: 0.85 },
  { path: '/pc/community', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/ai', changeFrequency: 'weekly', priority: 0.75 },
  { path: '/hotsector', changeFrequency: 'daily', priority: 0.7 },
  { path: '/pc/hotsector', changeFrequency: 'daily', priority: 0.65 },
  { path: '/arbitrage', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/pricerank', changeFrequency: 'hourly', priority: 0.65 },
  { path: '/hotrank', changeFrequency: 'hourly', priority: 0.65 },
  { path: '/exchangerank', changeFrequency: 'daily', priority: 0.6 },
  { path: '/fundingrate', changeFrequency: 'hourly', priority: 0.6 },
  { path: '/tradevol', changeFrequency: 'hourly', priority: 0.55 },
  { path: '/pc/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/pc/help', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/me', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/subscribe', changeFrequency: 'weekly', priority: 0.4 },
];
