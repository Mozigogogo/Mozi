import withLess from 'next-plugin-less';
import config from './config/index.js';

const { API_BASE_URL, PROJECT_ID } = config;

const nextConfig = withLess({
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  images: {
    domains: ['localhost', 'example.com'],
    unoptimized: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.externals = webpackConfig.externals || [];
    webpackConfig.externals.push('pino-pretty', 'lokijs', 'encoding');
    webpackConfig.resolve = webpackConfig.resolve || {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias || {}),
      '@react-native-async-storage/async-storage': false,
    };
    return webpackConfig;
  },
  env: {
    API_BASE_URL,
    NEXT_PUBLIC_PROJECT_ID: PROJECT_ID,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE_URL}/:path*`,
      },
      {
        // 涨跌分布接口单独代理，不加 /api 前缀
        source: '/easy/:path*',
        destination: `${API_BASE_URL}/easy/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
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
            source: '/((?!_next/static|_next/image|api/|favicon.ico|manifest.json).*)',
            headers: noStoreDocument,
          },
        ];

    return [
      ...cacheHeaders,
      {
        source: '/(.*)',
        headers: [
          // 允许在 Telegram 域中以 iframe 方式加载 WebApp
          // 注意：X-Frame-Options 无法做域白名单，只能 DENY / SAMEORIGIN
          // 所以这里改用 CSP 的 frame-ancestors 来限制允许的嵌入来源
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self' https: data: blob:; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
              "style-src 'self' 'unsafe-inline' https:; " +
              "img-src 'self' data: https: blob:; " +
              "connect-src 'self' https: wss:; " +
              "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org;",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // 不设置 X-Frame-Options，让 CSP frame-ancestors 控制 iframe 嵌入
          { key: 'X-Frame-Options', value: '' },
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

export default nextConfig;
