/**
 * 站点 SEO 基础配置（前端正式站 moziai.xyz）
 * askmozi.com 为 AI 服务域名，勿用作 sitemap / canonical
 * 可通过 NEXT_PUBLIC_SITE_URL 覆盖（生产建议设为 https://moziai.xyz）
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://moziai.xyz'
).replace(/\/$/, '');

export const SITE_NAME_ZH = '墨子 Mozi';
export const SITE_NAME_EN = 'Mozi';
/** 公司 / 品牌正式英文名（搜索词 MoziInnovations） */
export const BRAND_LEGAL_NAME = 'MoziInnovations';
/** 品牌别名：用于 JSON-LD alternateName、keywords、标题识别 */
export const BRAND_ALIASES = [
  '墨子',
  'Mozi',
  'MoziInnovations',
  'Mozi Innovations',
  'MoziInnovation',
  'moz',
  'moziai',
  'moziai.xyz',
];

export const DEFAULT_TITLE =
  'MoziInnovations (Mozi / 墨子) - AI Prediction & Quant Strategy Assistant';
export const DEFAULT_DESCRIPTION =
  'MoziInnovations (Mozi / moz / 墨子) — crypto data intelligence platform with AI market prediction, quant strategy assistant, smart alerts, arbitrage radar and sector analytics. 墨子：AI 预测、量化策略助手与加密货币数据分析。moziai.xyz';

export const DEFAULT_TITLE_ZH =
  '墨子 Mozi | AI 预测与量化策略助手 - 加密货币数据分析';
export const DEFAULT_DESCRIPTION_ZH =
  '墨子 Mozi（MoziInnovations / moz）是加密货币数据分析平台，提供 AI 行情预测、量化策略助手、智能预警、套利雷达、板块分析与交易社区。官网 moziai.xyz。';

export const DEFAULT_KEYWORDS = [
  '墨子',
  'Mozi',
  'MoziInnovations',
  'Mozi Innovations',
  'MoziInnovation',
  'moz',
  'moziai',
  'moziai.xyz',
  // English discovery keywords
  'crypto',
  'cryptocurrency',
  'crypto market',
  'crypto data',
  'crypto alerts',
  'trading alerts',
  'price alert',
  'arbitrage',
  'sector rotation',
  'market intelligence',
  'bitcoin',
  'BTC',
  'ETH',
  'US stocks',
  'crypto community',
  'AI prediction',
  'quant strategy',
  'quantitative trading',
  'crypto analytics',
  // Chinese keywords
  '加密货币',
  '数字货币',
  '加密货币数据分析',
  'AI预测',
  'AI 预测',
  '量化策略',
  '量化策略助手',
  '行情',
  '比特币',
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
    title.includes('墨子') ||
    title.includes(BRAND_LEGAL_NAME);
  const pageTitle = alreadyBranded
    ? shortTitle
    : `${shortTitle} | ${SITE_NAME_ZH}`;
  const url = absoluteUrl(path);
  const keywordList = Array.isArray(keywords)
    ? [...new Set([...keywords, ...BRAND_ALIASES])]
    : DEFAULT_KEYWORDS;

  return {
    // 已含品牌名的标题用 absolute，避免被根 layout template 再拼一次
    title: alreadyBranded ? { absolute: pageTitle } : shortTitle,
    description,
    keywords: keywordList,
    applicationName: `${BRAND_LEGAL_NAME} · ${SITE_NAME_EN}`,
    authors: [{ name: BRAND_LEGAL_NAME, url: SITE_URL }],
    creator: BRAND_LEGAL_NAME,
    publisher: BRAND_LEGAL_NAME,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      locale: 'en_US',
      alternateLocale: ['zh_CN'],
      url,
      siteName: `${BRAND_LEGAL_NAME} · ${SITE_NAME_ZH}`,
      title: pageTitle,
      description,
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: `${BRAND_LEGAL_NAME} ${SITE_NAME_EN}`,
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

/** Organization + WebSite JSON-LD，强化品牌别名可被搜索引擎关联 */
export function buildBrandJsonLd({
  description = DEFAULT_DESCRIPTION,
} = {}) {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_LEGAL_NAME,
    legalName: BRAND_LEGAL_NAME,
    alternateName: BRAND_ALIASES,
    url: SITE_URL,
    logo: absoluteUrl('/favicon.png'),
    image: absoluteUrl('/favicon.png'),
    description,
    email: 'notice@moziinnovations.com',
    knowsLanguage: ['en', 'zh'],
    sameAs: [
      'https://t.me/MoziInnovations',
      'https://x.com/moziinnovation',
      'https://discord.gg/GJW6h9GNQ8',
    ],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_LEGAL_NAME,
    alternateName: BRAND_ALIASES,
    url: SITE_URL,
    description,
    inLanguage: ['en', 'zh-CN'],
    publisher: {
      '@type': 'Organization',
      name: BRAND_LEGAL_NAME,
      url: SITE_URL,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/pc/search?keyword={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return { organization, website };
}

/** 社区页专用 keywords */
export const COMMUNITY_KEYWORDS = [
  BRAND_LEGAL_NAME,
  ...BRAND_ALIASES,
  '加密货币社区',
  '币圈社区',
  '加密社区',
  '币圈讨论',
  '热门话题',
  '加密货币讨论',
  'BTC 社区',
  'ETH 讨论',
  'crypto community',
  'crypto discussion',
  'crypto forum',
  'trading community',
  'market discussion',
];

export const COMMUNITY_TITLE =
  `加密货币社区 | ${BRAND_LEGAL_NAME}（Mozi / 墨子）`;
export const COMMUNITY_DESCRIPTION =
  `${BRAND_LEGAL_NAME}（Mozi / 墨子）加密货币社区：浏览热门话题与精选帖子，讨论 BTC/ETH 行情、板块轮动与交易观点，发现好币与市场机会。Crypto community for market discussion, hot topics and trading insights.`;

export const COMMUNITY_PC_TITLE =
  `Crypto Community | ${BRAND_LEGAL_NAME}（Mozi / 墨子）`;
export const COMMUNITY_PC_DESCRIPTION =
  `${BRAND_LEGAL_NAME} desktop crypto community: hot topics, featured posts, BTC/ETH market discussion and trading insights. MoziInnovations（Mozi / 墨子）PC 社区：热门话题、精选帖子与币圈观点交流。`;

/**
 * CollectionPage + BreadcrumbList JSON-LD（社区列表页）
 */
export function buildCommunityJsonLd({
  path = '/community',
  name = COMMUNITY_TITLE,
  description = COMMUNITY_DESCRIPTION,
} = {}) {
  const url = absoluteUrl(path);
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#community`,
    name,
    description,
    url,
    inLanguage: ['zh-CN', 'en'],
    isPartOf: {
      '@type': 'WebSite',
      name: BRAND_LEGAL_NAME,
      url: SITE_URL,
    },
    about: [
      { '@type': 'Thing', name: 'Cryptocurrency' },
      { '@type': 'Thing', name: 'Crypto trading community' },
      { '@type': 'Thing', name: '加密货币社区' },
    ],
    publisher: {
      '@type': 'Organization',
      name: BRAND_LEGAL_NAME,
      alternateName: BRAND_ALIASES,
      url: SITE_URL,
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: BRAND_LEGAL_NAME,
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Community',
        item: url,
      },
    ],
  };

  return { collectionPage, breadcrumb };
}

/** 纯文本摘要，用于 meta description / JSON-LD */
export function plainTextExcerpt(input, maxLen = 160) {
  const text = String(input || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

/**
 * 帖子详情 DiscussionForumPosting + BreadcrumbList
 */
export function buildPostJsonLd(post, postId) {
  const id = String(postId || post?.id || '').trim();
  const path = id ? `/commentinfo?id=${encodeURIComponent(id)}` : '/commentinfo';
  const url = absoluteUrl(path);
  const title =
    plainTextExcerpt(post?.title, 110) ||
    `社区帖子 | ${BRAND_LEGAL_NAME}`;
  const body = plainTextExcerpt(post?.content, 5000);
  const description =
    plainTextExcerpt(post?.content || post?.title, 200) ||
    `${BRAND_LEGAL_NAME} 加密货币社区帖子`;

  const authorName =
    String(post?.nickName || post?.user?.nickname || post?.user?.nickName || '').trim() ||
    BRAND_LEGAL_NAME;

  const datePublished = post?.createdAt
    ? String(post.createdAt).includes('T')
      ? String(post.createdAt)
      : `${String(post.createdAt).replace(' ', 'T')}`
    : undefined;
  const dateModified = post?.updatedAt
    ? String(post.updatedAt).includes('T')
      ? String(post.updatedAt)
      : String(post.updatedAt)
    : datePublished;

  const keywords = [
    BRAND_LEGAL_NAME,
    'Mozi',
    '墨子',
    '加密货币社区',
    post?.category,
    ...(Array.isArray(post?.topics) ? post.topics.map((t) => t?.name).filter(Boolean) : []),
    ...(Array.isArray(post?.tags) ? post.tags.map((t) => t?.name || t).filter(Boolean) : []),
  ].filter(Boolean);

  const article = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': `${url}#post`,
    headline: title,
    name: title,
    description,
    articleBody: body || description,
    url,
    mainEntityOfPage: url,
    inLanguage: ['zh-CN', 'en'],
    keywords: keywords.join(', '),
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND_LEGAL_NAME,
      alternateName: BRAND_ALIASES,
      url: SITE_URL,
      logo: absoluteUrl('/favicon.png'),
    },
    interactionStatistic: [
      post?.likeCnt != null
        ? {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: Number(post.likeCnt) || 0,
          }
        : null,
      post?.commentCnt != null
        ? {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: Number(post.commentCnt) || 0,
          }
        : null,
    ].filter(Boolean),
  };

  if (Array.isArray(post?.images) && post.images[0]) {
    article.image = post.images[0];
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: BRAND_LEGAL_NAME,
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Community',
        item: absoluteUrl('/community'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: url,
      },
    ],
  };

  return { article, breadcrumb, title, description, path, keywords };
}

/**
 * 话题详情 CollectionPage + BreadcrumbList
 * @param {object} topic
 * @param {string|number} topicId
 * @param {{ title?: string, description?: string }} [queryFallback]
 */
export function buildTopicJsonLd(topic, topicId, queryFallback = {}) {
  const id = String(topicId || topic?.id || '').trim();
  const path = id
    ? `/topicinfo?id=${encodeURIComponent(id)}`
    : '/topicinfo';
  const url = absoluteUrl(path);

  const rawName =
    topic?.name ||
    topic?.title ||
    queryFallback?.title ||
    '';
  const name = plainTextExcerpt(rawName, 110) || `社区话题 | ${BRAND_LEGAL_NAME}`;
  const headline = name.startsWith('#') ? name : `#${name}`;

  const description =
    plainTextExcerpt(
      topic?.description || queryFallback?.description || '',
      200
    ) ||
    `${BRAND_LEGAL_NAME}（Mozi / 墨子）加密货币社区话题「${plainTextExcerpt(name, 60)}」：相关讨论、行情观点与热门帖子。`;

  const keywords = [
    BRAND_LEGAL_NAME,
    'Mozi',
    '墨子',
    '加密货币社区',
    '热门话题',
    plainTextExcerpt(name, 40),
  ].filter(Boolean);

  const datePublished = topic?.createdAt
    ? String(topic.createdAt).includes('T')
      ? String(topic.createdAt)
      : String(topic.createdAt).replace(' ', 'T')
    : undefined;

  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#topic`,
    name: headline,
    headline,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: ['zh-CN', 'en'],
    keywords: keywords.join(', '),
    datePublished,
    about: {
      '@type': 'Thing',
      name: plainTextExcerpt(name, 80),
    },
    isPartOf: {
      '@type': 'WebSite',
      name: BRAND_LEGAL_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND_LEGAL_NAME,
      alternateName: BRAND_ALIASES,
      url: SITE_URL,
      logo: absoluteUrl('/favicon.png'),
    },
    interactionStatistic: [
      topic?.likeCnt != null
        ? {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: Number(topic.likeCnt) || 0,
          }
        : null,
      topic?.commentCnt != null
        ? {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: Number(topic.commentCnt) || 0,
          }
        : null,
    ].filter(Boolean),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: BRAND_LEGAL_NAME,
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Community',
        item: absoluteUrl('/community'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: headline,
        item: url,
      },
    ],
  };

  return {
    collectionPage,
    breadcrumb,
    title: headline,
    description,
    path,
    keywords,
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
