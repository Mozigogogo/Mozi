const withLess = require('next-plugin-less');
const { API_BASE_URL, PROJECT_ID } = require('./config');

module.exports = withLess({
  reactStrictMode: true,
  // 仅用于线上排查：开启浏览器 sourcemap，便于从 chunk 调用栈映射回 src/ 源码。
  // 排查完成后建议关闭，避免暴露源码细节。
  productionBrowserSourceMaps: true,
  images: {
    domains: ['localhost', 'moziinnovations.com'],
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
  },
  async rewrites() {
    return [
      // {
      //   source: '/api/robot_proxy/:path*',
      //   destination: 'https://mozibackend-production.up.railway.app/:path*',
      // },
      {
        source: '/api/:path*',
        destination: `${API_BASE_URL}/:path*`,
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
    return [
      // Telegram WebView（以及部分移动端 WebView）对静态资源缓存较激进。
      // 这里对 Next 的构建产物资源禁用长缓存，确保线上更新能尽快生效。
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // HTML 文档禁止强缓存，避免旧 HTML 引用新版本已不存在的 chunk
      {
        source: '/((?!_next/static|_next/image|api/|favicon.ico|manifest.json).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
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
        source: '/((?!tg/).*)',
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
