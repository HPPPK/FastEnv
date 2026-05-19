#!/bin/bash

# EnvGuard 构建脚本
# 支持跨平台打包

set -e

echo "🔨 EnvGuard 构建系统"
echo "===================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 构建前端
echo ""
echo "🎨 构建前端资源..."
npm run build:frontend

# 构建 Electron
echo ""
echo "⚙️  构建 Electron 主进程..."
npm run build:electron

# 打包应用
echo ""
echo "📦 打包应用..."

case "${1:-all}" in
  win)
    echo "🪟 打包 Windows 版本..."
    npm run build:win
    ;;
  mac)
    echo "🍎 打包 macOS 版本..."
    npm run build:mac
    ;;
  linux)
    echo "🐧 打包 Linux 版本..."
    npm run build:linux
    ;;
  all)
    echo "🌍 打包所有平台..."
    npm run build:win
    npm run build:mac
    npm run build:linux
    ;;
  *)
    echo "❌ 未知的平台: $1"
    echo "用法: ./build.sh [win|mac|linux|all]"
    exit 1
    ;;
esac

echo ""
echo "✅ 构建完成！"
echo "📁 输出目录: ./release"
