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

- **启动命令**：`npm start`（即 `node bot/telegram-bot.js`）  
- 将仓库根目录作为运行目录，安装依赖后执行 `npm start` 即可。若平台要求子目录为 `bot/`，可在该目录内仅保留 `telegram-bot.js` 并单独配置 `package.json` 指向同一条 `node telegram-bot.js` 命令。  

## 目录结构

```
.
├── package.json      # 依赖与启动脚本
├── .env.example
├── README.md
└── bot/
    └── telegram-bot.js
```
