/**
 * 运行时配置中心
 * - 统一管理各环境下的变量
 * - 允许通过 process.env 覆盖（如部署平台注入）
 */

const APP_ENV =
  process.env.NEXT_PUBLIC_APP_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'development';

// 各环境默认值（可按需修改）
const ENV_CONFIG = {
  development: {
    API_BASE_URL: 'https://moziinnovations.com',  
    WS_URL: 'wss://moziinnovations.com/ws', // 后端已支持 WSS
  },
  production: {
    API_BASE_URL: 'https://moziinnovations.com',  // 添加端口号
    WS_URL: 'wss://moziinnovations.com/ws', // 后端已支持 WSS
  },
  test: {
    API_BASE_URL: 'https://moziinnovations.com',
    WS_URL: 'wss://moziinnovations.com/ws',
  },
};

const selectedConfig = ENV_CONFIG[APP_ENV] || ENV_CONFIG.development;

// 支持通过环境变量覆盖默认值
const API_BASE_URL = process.env.API_BASE_URL || selectedConfig.API_BASE_URL;
// WebSocket 服务器地址；优先读取公开前缀，便于在浏览器端使用
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.WS_URL || selectedConfig.WS_URL;
// Reown AppKit 项目ID（用于钱包连接）；优先读取公开前缀，便于在浏览器端使用
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || process.env.PROJECT_ID || 'b258644e56a8613d8d020223eab73c4f';

module.exports = {
  APP_ENV,
  API_BASE_URL,
  WS_URL,
  PROJECT_ID,
};


