/** @type {import('next').NextConfig} */
import config from './config/index.js';
const { API_BASE_URL, PROJECT_ID } = config;
const nextConfig = {
  // 启用 React 严格模式
  reactStrictMode: true,
  // 配置图片域名白名单
  images: {
    domains: ['localhost', 'example.com'],
    // 允许未优化的图片
    unoptimized: true,
  },
  // 配置环境变量（构建时注入）
  env: {
    API_BASE_URL: API_BASE_URL,
    NEXT_PUBLIC_PROJECT_ID: PROJECT_ID,
  },
  // 配置API代理（与 next.config.js 保持一致）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
  // 配置重定向
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // 配置 headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
