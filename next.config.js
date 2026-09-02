const { withSentryConfig } = require('@sentry/nextjs');
const withLess = require('next-plugin-less');
const { API_BASE_URL, PROJECT_ID, ROBOT_BACKEND_URL, BIGORDER_CHAT_API } = require('./config');
const isSentryEnabled = String(process.env.NEXT_PUBLIC_ENABLE_SENTRY || '').toLowerCase() === 'true';

const nextConfig = withLess({
  transpilePackages: ['@ton/ton', '@ton/core'],
  reactStrictMode: true,
  // 仅用于线上排查：开启浏览器 sourcemap，便于从 chunk 调用栈映射回 src/ 源码。
  // 排查完成后建议关闭，避免暴露源码细节。
  productionBrowserSourceMaps: false,
  images: {
    domains: ['localhost', 'moziinnovations.com', 'image-1317406749.cos.ap-shanghai.myqcloud.com'],
    unoptimized: true,
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
  env: {
    API_BASE_URL,
    NEXT_PUBLIC_PROJECT_ID: PROJECT_ID,
    NEXT_PUBLIC_ROBOT_BACKEND_URL: ROBOT_BACKEND_URL,
    NEXT_PUBLIC_BIGORDER_CHAT_API: BIGORDER_CHAT_API,
  },
  async rewrites() {
    return [
      // {
      //   source: '/api/robot_proxy/:path*',
      //   destination: 'https://askmozi.com/:path*',
      // },
      {
        source: '/autoarb/api/:path*',
        destination: `${API_BASE_URL}/autoarb/api/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      // NOTE: keep /home as a real app page (see src/app/home/page.jsx)
    ];
  },
  async headers() {
    const dev = process.env.NODE_ENV === 'development';

    const noStoreDocument = [
      {
        key: 'Cache-Control',
        value: 'private, no-cache, no-store, must-revalidate',
      },
      { key: 'Pragma', value: 'no-cache' },
      { key: 'Expires', value: '0' },
    ];

    const cacheHeaders = dev
      ? [
          // 本地 dev：禁用整个 /_next（含 webpack-hmr、chunks），避免浏览器沿用旧脚本
          {
            source: '/_next/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'no-store, must-revalidate',
              },
            ],
          },
          {
            source: '/((?!_next/|api/|favicon.ico|manifest.json).*)',
            headers: noStoreDocument,
          },
        ]
      : [
          // 生产：带 hash 的静态资源可长期缓存；HTML/RSC 路由禁止强缓存
          {
            source: '/_next/static/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable',
              },
            ],
          },
          {
            source: '/((?!_next/static|_next/image|api/|favicon.ico|manifest.json|sitemap.xml|robots.txt).*)',
            headers: noStoreDocument,
          },
        ];

    return [
      ...cacheHeaders,
      // sitemap / robots：仅缓存，不加 X-Frame-Options 等 HTML 安全头
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
          { key: 'Content-Type', value: 'application/xml; charset=utf-8' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
        ],
      },
      {
        source: '/tg/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://web.telegram.org https://t.me https://*.telegram.org",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/((?!tg/|sitemap\\.xml|robots\\.txt).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
  lessLoaderOptions: {
    lessOptions: {
      javascriptEnabled: true,
    },
  },
});

module.exports = isSentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: false,
      disableLogger: true,
      tunnelRoute: '/monitoring',
    })
  : nextConfig;
