/** @type {import('next').NextConfig} */
const { API_BASE_URL, PROJECT_ID } = require('./config');
const nextConfig = {
  // 启用 React 严格模式
  reactStrictMode: true,
  // 配置图片域名白名单
  images: {
    domains: ['localhost', 'moziinnovations.com'],
    // 允许未优化的图片
    unoptimized: true,
  },
  // 配置 webpack
  webpack: (config) => {
    // AppKit 文档建议在 SSR 环境排除某些仅在 Node 端使用的包
    config.externals = config.externals || [];
    config.externals.push(
      'pino-pretty',
      'lokijs',
      'encoding'
    );
    // 修复部分钱包 SDK 误引入 RN 模块的问题
    config.resolve = config.resolve || {};
    config.resolve.alias = Object.assign({}, config.resolve.alias, {
      '@react-native-async-storage/async-storage': false,
    });
    return config;
  },
  // 配置环境变量（构建时注入）
  env: {
    API_BASE_URL: API_BASE_URL,
    NEXT_PUBLIC_PROJECT_ID: PROJECT_ID,
  },
  // 配置API代理解决跨域问题
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

module.exports = nextConfig;