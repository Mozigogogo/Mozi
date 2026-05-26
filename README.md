# Mozi Telegram Bot

本仓库此分支**仅包含** `bot/` 中的 Telegram 机器人服务及根目录运行配置（无 H5 / Next 前端）。

## 功能

- `/start`：欢迎、邀请码、打开 Mini App、社区与 X 链接  
- `/alert <symbol>`：引导至 Mini App 币种详情配置价格告警  
- `/ai`、`/chat`、`/balance`：先 `POST …/user/tg/registered/check`（未注册则群内 @ 提示 + 私信「一键注册」打开 Mini App `/user`；绑定成功后下次通过校验时私信祝贺），再换 JWT、`token-check` 后执行业务  
- `/ai <问题>`：默认 `APP_URL` + `/api/robot_proxy/api/v1/analyze/stream`，请求体与 `/chat` 相同（`message` + `lang`，可选 `symbol`）；可用 `AI_BACKEND_URL` 覆盖完整 URL；底部积分默认 **50**；analyze 失败时可自动回退 chat/stream（`AI_ANALYZE_FALLBACK_TO_CHAT`）  
- `/chat <内容>`：POST 流式对话（默认 `APP_URL` + `/api/robot_proxy/api/v1/chat/stream`，与 Web 一致；可用 `AI_CHAT_BACKEND_URL` 覆盖）；底部展示积分默认 **10**（可由后端 `pointsCost` 覆盖）；对用户文案做简易币种意图识别，命中时在请求体中带 `symbol`（见 `bot/lib/symbolIntent.js`）  

## 环境变量

复制 `.env.example` 为 `.env` 并填写，或在部署平台配置：

| 变量 | 说明 |
|------|------|
| `BOT_TOKEN` | 必填，来自 BotFather |
| `APP_URL` | Mini App 根地址，默认见 `.env.example` |
| `BOT_USERNAME` | 机器人用户名（无 `@`） |
| `ALERT_CARD_IMAGE` | 可选，消息卡片图片 URL |
| `API_BASE_URL` | 自建 API 根地址，默认 `https://moziinnovations.com`（`/price` 等）；`/chat` 默认流式地址见 `APP_URL` + `robot_proxy` 路径 |
| `AI_BACKEND_URL` | 可选；覆盖 `/ai` 的 **完整流式 POST URL**（请求体与 `/chat` 一致）；不设时默认 `APP_URL/api/robot_proxy/api/v1/analyze/stream` |
| `AI_ANALYZE_FALLBACK_TO_CHAT` | 可选；`/ai` 请求 analyze 失败（如 422）时是否自动改请求 **chat/stream**（默认 `1`）；`0`/`false` 关闭 |
| `AI_CHAT_BACKEND_URL` | 可选；覆盖 `/chat` 的 **完整流式 POST URL**（默认 `APP_URL/api/robot_proxy/api/v1/chat/stream`） |
| `AI_CHAT_STREAM_TIMEOUT_MS` | 可选；`/ai` 与 `/chat` 等待 SSE 的最长时间（毫秒），默认 `300000`（5 分钟） |
| `MOZI_DETAIL_AUTH` | 可选；Bootstrap JWT，请求头 `authentication`。在尚无用户 JWT 时用于 `POST …/user/tg/registered/check` 与 `POST …/user/login`（Telegram）；建议生产配置以便群内校验注册态 |
| `TG_LOGIN_PATH` | 可选；相对 `API_BASE_URL` 的登录路径，默认 **`user/login`**（与 H5 `loginByTelegram` 相同：`chanel:3`、`type:'login'`、`channel:'tg'`、`telegramId`、`username`、`photoUrl`、`hash`、`inviteCode`、`env`；Bot 无 WebApp 时 `hash` 为空串）；响应中解析 `token` / `accessToken` 等（见 `bot/lib/tgUserTokenCache.js`） |
| `MOZI_APP_ENV` / `NEXT_PUBLIC_APP_ENV` | 可选；写入登录 body 的 `env`（与前端一致），未设时默认 `test` |
| `AI_POINTS_COST` | 可选；`/ai` 回复底部展示的积分数（后端未返回 `pointsCost` 时），默认 `50` |
| `USER_DATA_INFO_PATH` | 可选；`/balance` 请求的相对路径，默认 `user/datainfo` |
| `USER_DATA_INFO_TIMEOUT_MS` | 可选；`GET user/datainfo` 超时（毫秒），默认 **45000**；此前为 15s，慢接口会触发 Abort 被误报为网络异常 |
| `AI_CHAT_POINTS_COST` | 可选；`/chat` 回复底部展示的积分数（后端未返回 `pointsCost` 时），默认 `10` |
| `TG_CHAT_API_PORT` | 可选；大于 0 时随 Bot 启动内嵌 HTTP：`POST /tg/chat/save`、`GET /tg/chat/get?telegramId=…`（按用户+群缓存提问，**TTL 10 分钟**）；默认 `0` 不启动 |

### TG 群内提问缓存 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/tg/chat/save` | Body：`{ "groupId", "telegramId", "question", "command": "ai" \| "chat" }` |
| `GET` | `/tg/chat/get?telegramId=…` | 返回 `[{ "groupId", "question", "command" }, …]` |
| `DELETE` | `/tg/chat/remove?telegramId=&groupId=` | 重放成功后清除 |
| `POST` | `/tg/chat/on-registered` | Body：`{ "telegramId", "groupId"? }` — 绑定成功立即重放（可选，建议 H5/后端调用） |

**流程**：未注册用户使用 `/ai`、`/chat` 带问题 → 保存并 **每 3s 轮询** `registered/check` → 一旦注册完成，Bot **自动**在群内/私聊执行原命令（用户无需再输入）。也可在绑定成功时调 `on-registered` 立即触发。

实现：`bot/lib/tgChatRegisterWatcher.js`、`bot/lib/tgChatProactiveReplay.js`。

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
