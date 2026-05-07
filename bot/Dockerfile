# 构建上下文为仓库子目录 bot/ 时使用（Root Directory = bot）
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY config.js i18n.js telegram-bot.js ./
COPY lib ./lib
COPY handlers ./handlers

ENV NODE_ENV=production
CMD ["node", "telegram-bot.js"]
