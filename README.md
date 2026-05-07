# Mozi Telegram Bot

本仓库此分支**仅包含** `bot/` 中的 Telegram 机器人服务及根目录运行配置（无 H5 / Next 前端）。

## 功能

- `/start`：欢迎、邀请码、打开 Mini App、社区与 X 链接  
- `/alert <symbol>`：引导至 Mini App 币种详情配置价格告警  

## 环境变量

复制 `.env.example` 为 `.env` 并填写，或在部署平台配置：

| 变量 | 说明 |
|------|------|
| `BOT_TOKEN` | 必填，来自 BotFather |
| `APP_URL` | Mini App 根地址，默认见 `.env.example` |
| `BOT_USERNAME` | 机器人用户名（无 `@`） |
| `ALERT_CARD_IMAGE` | 可选，消息卡片图片 URL |

## 本地运行

```bash
npm install
cp .env.example .env
# 编辑 .env 填入 BOT_TOKEN
npm start
```

## 部署

- **根目录**：使用仓库**根**（含 `package.json`），不要指到子目录 `bot/`  alone。  
- **启动命令**：`npm start` 或 `node bot/telegram-bot.js`。  
- **构建命令**：勿再填 `next build`。若平台里曾配置过，请**清空**或改为 `npm run build`（本仓库的 `build` 仅作占位校验，无前端打包）。  
- 仓库根目录有 **`railway.json`**：指定 **`builder: DOCKERFILE`**，避免默认 **Railpack** 仍按旧前端流程推断构建而失败。  
- **`Dockerfile`**：`npm ci` 后复制 `bot/` 再启动；部署前请把本次改动 **push 到 GitHub**。  
- 若在 Railway 面板里曾填过 **Build Command**（例如 `next build`），可在 Settings 里删空；配置以仓库里的 **`railway.json`** 为准并会覆盖面板。  
- 环境变量在 Railway **Variables** 里配置 `BOT_TOKEN` 等（勿把 token 写进代码）。  

## 目录结构

```
.
├── package.json
├── package-lock.json
├── Dockerfile
├── railway.json
├── .env.example
├── README.md
└── bot/
    └── telegram-bot.js
```
