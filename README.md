# 墨子数字货币行情社区 H5

墨子数字货币行情社区 H5 是基于 [Next.js](https://nextjs.org) 开发的移动端 Web 应用，提供数字货币行情、社区讨论、币种详情等功能。本项目是墨子数字货币行情社区小程序的 H5 版本。

## 功能特点

- 首页：展示热门币种、热门板块、热门合约和衍生品专区
- 发现页：展示市场行情、自选币种和排行榜
- 社区页：提供社区讨论、话题创建和帖子互动功能
- 用户页：个人信息管理、自选管理、告警设置等
- 搜索功能：支持搜索币种、行业和话题
- 币种详情：展示币种基本信息、K线图表和市场行情

## 快速开始

### 方法一：使用启动脚本

```bash
# 添加执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

### 方法二：手动安装和启动

```bash
# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npm run dev
```

启动后，在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 技术栈

- **前端框架**：Next.js 15.3.5
- **UI 组件库**：Antd Mobile
- **HTTP 请求**：Axios
- **样式方案**：CSS Modules
- **移动端适配**：postcss-px-to-viewport-8-plugin

## 项目结构

```
config/
├── index.js          # 运行时配置中心（统一导出 API_BASE_URL 等）
src/
├── app/                # 页面目录
│   ├── page.js         # 首页
│   ├── find/           # 发现页
│   ├── community/      # 社区页
│   ├── user/           # 用户页
│   ├── detail/         # 币种详情页
│   ├── search/         # 搜索页
│   └── app.config.js   # 应用配置
├── components/         # 公共组件
│   ├── Layout/         # 布局组件
│   ├── MoziCard/       # 卡片组件
│   ├── Loading/        # 加载组件
│   └── SearchInput/    # 搜索输入框组件
└── utils/              # 工具函数
    ├── request.js      # 请求封装
    ├── constants.js    # 常量定义
    └── core.js         # 核心工具函数
```

## 部署说明
### Web3（Reown AppKit）

1) 安装依赖（已使用 pnpm 可跳过）

```bash
pnpm add @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
```

2) 配置 Project ID（来自 Reown Dashboard）

运行或构建前导出 `NEXT_PUBLIC_PROJECT_ID`：

```bash
NEXT_PUBLIC_PROJECT_ID=xxxxx pnpm dev
```

3) 使用方式

- 全局 `Web3Provider` 已在 `src/app/layout.js` 注入
- 在“我的”页登录区已加入 `<appkit-button />`，可直接连接钱包
- 若需在其它页面触发，可直接放置 `<appkit-button />`

参考文档：[Reown AppKit Next 安装指南](https://docs.reown.com/appkit/next/core/installation)


### 环境变量与配置

本项目使用 `config/index.js` 统一管理环境变量与代理目标地址：

```
// config/index.js
module.exports = {
  APP_ENV,        // development | production | test
  API_BASE_URL,   // 后端 API 基础地址
};
```

- 可通过 `APP_ENV`、`API_BASE_URL` 两个环境变量在构建时覆盖默认值
- `next.config.js/.mjs` 会将 `API_BASE_URL` 注入构建时环境，并用于 `/api/*` 的代理转发
- 前端请求统一以 `/api` 为前缀（见 `src/utils/constants.js` 的 `INTERFACE_URL = '/api'`）

示例（本地开发覆盖 API 目标）：

```bash
API_BASE_URL=https://moziinnovations.com npm run dev
```

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
# 构建项目
npm run build

# 启动生产服务
npm run start
```

### 使用 Vercel 部署

本项目可以直接部署到 [Vercel 平台](https://vercel.com)，只需将代码推送到 GitHub 仓库，然后在 Vercel 中导入该仓库即可。

## 注意事项

- 本项目使用了 `--legacy-peer-deps` 标志安装依赖，以解决 antd-mobile 与 React 19 的兼容性问题
- 移动端适配使用了 viewport 方案，确保在不同设备上有一致的显示效果
- 深色模式已适配，会根据系统设置自动切换
