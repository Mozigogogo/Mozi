# Mozi Telegram Bot

本仓库此分支**仅包含** `bot/` 中的 Telegram 机器人服务及根目录运行配置（无 H5 / Next 前端）。

## 功能

- `/start`：欢迎、邀请码、打开 Mini App、社区与 X 链接  
- `/alert <symbol>`：引导至 Mini App 币种详情配置价格告警  
- `/ai <问题>`：POST 流式接口（默认直连 `https://mozibackend-production.up.railway.app/api/v1/analyze/stream`，可用 `AI_BACKEND_URL` 覆盖）；群内/私聊回复分析；底部展示积分（默认 50，可由后端 `pointsCost` 覆盖）  
- `/chat <内容>`：POST 流式对话（默认 `APP_URL` + `/api/robot_proxy/api/v1/chat/stream`，与 Web 一致；可用 `AI_CHAT_BACKEND_URL` 覆盖）；展示积分规则同 `/ai`  

## 环境变量

复制 `.env.example` 为 `.env` 并填写，或在部署平台配置：

| 变量 | 说明 |
|------|------|
| `BOT_TOKEN` | 必填，来自 BotFather |
| `APP_URL` | Mini App 根地址，默认见 `.env.example` |
| `BOT_USERNAME` | 机器人用户名（无 `@`） |
| `ALERT_CARD_IMAGE` | 可选，消息卡片图片 URL |
| `API_BASE_URL` | 自建 API 根地址，默认 `https://moziinnovations.com`（`/price` 等）；`/chat` 默认流式地址见 `APP_URL` + `robot_proxy` 路径 |
| `AI_BACKEND_URL` | 可选；覆盖 `/ai` 的 **完整流式 POST URL**；不设时默认 `https://mozibackend-production.up.railway.app/api/v1/analyze/stream`（契约见 `bot/lib/apis.js`） |
| `AI_CHAT_BACKEND_URL` | 可选；覆盖 `/chat` 的 **完整流式 POST URL**（默认 `APP_URL/api/robot_proxy/api/v1/chat/stream`） |
| `AI_BACKEND_SECRET` | 可选；若设置，请求头 `Authorization: Bearer …`（仅 `/ai` 分析流） |
| `MOZI_DETAIL_AUTH` | 可选；JWT，请求头 `authentication`（仅首次命令 `POST /user/tg/registered/check`；`/chat` 不传该头） |
| `AI_POINTS_COST` | 可选；回复底部展示的积分数，默认 `50` |

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
    ├── telegram-bot.js
    ├── config.js
    ├── i18n.js
    ├── lib/invite.js
    ├── lib/alertSymbol.js
    ├── lib/alertFlow.js
    ├── lib/apis.js
    ├── lib/aiQuery.js
    ├── lib/telegramHtml.js
    ├── handlers/start.js
    ├── handlers/alert.js
    ├── handlers/ai.js
    └── Dockerfile
```
