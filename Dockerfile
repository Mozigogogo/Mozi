# 纯 Node Telegram Bot（无 Next 构建）
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY bot ./bot

ENV NODE_ENV=production
CMD ["node", "bot/telegram-bot.js"]
