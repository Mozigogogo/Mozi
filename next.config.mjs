import withLess from 'next-plugin-less';
import config from './config/index.js';

const { API_BASE_URL, PROJECT_ID } = config;

const nextConfig = withLess({
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'example.com'],
    unoptimized: true,
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
        source: '/',
        destination: '/whitelist',
        permanent: false,
      },
      {
        source: '/home',
        destination: '/whitelist',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
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

export default nextConfig;
