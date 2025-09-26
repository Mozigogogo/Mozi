#!/bin/bash

# 墨子数字货币行情社区 H5 启动脚本

echo "正在启动墨子数字货币行情社区 H5 应用..."

# 安装依赖
if [ ! -d "node_modules" ]; then
  echo "正在安装依赖..."
  npm install --legacy-peer-deps
fi

# 启动开发服务器
echo "启动开发服务器..."
npm run dev