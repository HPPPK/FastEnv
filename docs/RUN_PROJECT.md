# EnvGuard 项目运行指南

## 前置要求

### 系统要求
- **macOS**: 10.13 或更高版本
- **Windows**: Windows 7 或更高版本
- **Linux**: Ubuntu 18.04 或更高版本

### 必需工具
- **Node.js**: v18.0.0 或更高版本
- **pnpm**: v8.0.0 或更高版本（推荐使用 corepack）
- **Git**: 用于版本控制

### 验证环境
```bash
# 检查 Node.js 版本
node --version  # 应该 >= v18.0.0

# 检查 pnpm 版本
pnpm --version  # 应该 >= v8.0.0

# 或使用 corepack
corepack --version
```

## 快速开始

### 1. 安装依赖

```bash
# 进入项目目录
cd /Users/panjingyu/Desktop/Project/ConfigureQuick

# 使用 corepack 安装依赖（推荐）
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm install

# 或直接使用 pnpm
pnpm install
```

### 2. 开发模式运行

```bash
# 启动开发服务器（同时启动 Electron 和 Vite）
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run dev

# 或分别启动
# 终端 1：启动 Vite 开发服务器
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run dev:vite

# 终端 2：启动 Electron 开发模式
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run dev:electron
```

### 3. 构建生产版本

```bash
# 构建前端资源
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run build:vite

# 构建 Electron 应用
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run build:electron

# 或一键构建
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run build
```

### 4. 打包应用

```bash
# 打包为可执行文件（自动检测平台）
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run package

# 或指定平台
# macOS
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run package:mac

# Windows
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run package:win

# Linux
PATH=/opt/homebrew/bin:/usr/local/bin:$PATH corepack pnpm run package:linux
```

## 详细命令说明

### 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 启动完整开发环境（Electron + Vite） |
| `pnpm run dev:vite` | 仅启动 Vite 开发服务器（端口 5173） |
| `pnpm run dev:electron` | 仅启动 Electron 开发模式 |
| `pnpm run type-check` | 运行 TypeScript 类型检查 |
| `pnpm run lint` | 运行 ESLint 代码检查 |
| `pnpm run format` | 使用 Prettier 格式化代码 |

### 构建命令

| 命令 | 说明 |
|------|------|
| `pnpm run build` | 完整构建（前端 + Electron） |
| `pnpm run build:vite` | 构建前端资源（输出到 dist） |
| `pnpm run build:electron` | 构建 Electron 主进程 |

### 打包命令

| 命令 | 说明 |
|------|------|
| `pnpm run package` | 打包为当前平台可执行文件 |
| `pnpm run package:mac` | 打包为 macOS dmg 文件 |
| `pnpm run package:win` | 打包为 Windows exe 文件 |
| `pnpm run package:linux` | 打包为 Linux deb 文件 |

## 项目结构

```
env-guard/
├── electron/              # Electron 主进程代码
│   ├── main/              # 主进程核心逻辑
│   ├── preload/           # 预加载脚本
│   └── ipc/               # IPC 通信处理
├── src/                   # 前端 React 代码
│   ├── pages/             # 页面组件
│   ├── components/        # 通用组件
│   ├── store/             # 状态管理
│   ├── api/               # API 调用层
│   ├── types/             # TypeScript 类型定义
│   └── utils/             # 工具函数
├── service/               # 后端业务服务
│   ├── env-scan/          # 环境扫描服务
│   ├── env-create/        # 环境创建服务
│   ├── env-install/       # 依赖安装服务
│   ├── env-conflict/      # 冲突检测和修复
│   ├── demand-parse/      # 需求解析服务
│   └── ai-integration/    # AI 集成服务
├── config/                # 配置文件
├── docs/                  # 项目文档
└── package.json           # 项目配置
```

## 开发工作流

### 1. 启动开发环境

```bash
# 安装依赖（首次）
pnpm install

# 启动开发服务器
pnpm run dev
```

此时会自动打开 Electron 窗口，显示应用界面。

### 2. 修改代码

- **前端代码**：修改 `src/` 目录下的文件，Vite 会自动热更新
- **主进程代码**：修改 `electron/` 目录下的文件，需要手动重启 Electron
- **后端服务**：修改 `service/` 目录下的文件，需要重启应用

### 3. 类型检查

```bash
# 检查 TypeScript 类型错误
pnpm run type-check

# 修复代码格式
pnpm run format
```

### 4. 构建和打包

```bash
# 构建生产版本
pnpm run build

# 打包应用
pnpm run package
```

## 常见问题

### Q1: 启动时报错 "Cannot find module"

**解决方案：**
```bash
# 清除 node_modules 和缓存
rm -rf node_modules pnpm-lock.yaml

# 重新安装依赖
pnpm install
```

### Q2: Electron 窗口不显示

**解决方案：**
1. 检查控制台是否有错误信息
2. 确保 Vite 开发服务器已启动（端口 5173）
3. 尝试重启应用

### Q3: 类型检查失败

**解决方案：**
```bash
# 运行类型检查查看具体错误
pnpm run type-check

# 修复代码格式
pnpm run format

# 重新检查
pnpm run type-check
```

### Q4: 打包失败

**解决方案：**
1. 确保已构建前端资源：`pnpm run build:vite`
2. 确保已构建 Electron 主进程：`pnpm run build:electron`
3. 检查 `build/` 目录是否存在必要的配置文件
4. 查看打包日志了解具体错误

## 调试技巧

### 1. 启用 DevTools

在 Electron 窗口中按 `Ctrl+Shift+I`（Windows/Linux）或 `Cmd+Option+I`（macOS）打开开发者工具。

### 2. 查看主进程日志

```bash
# 在终端中查看主进程输出
pnpm run dev:electron
```

### 3. 查看渲染进程日志

在 DevTools 的 Console 标签中查看。

### 4. 调试 IPC 通信

在 `electron/ipc/setup.ts` 中添加日志：
```typescript
console.log('IPC channel:', channel, 'args:', args);
```

## 性能优化

### 1. 开发模式优化

```bash
# 使用 --inspect 启用 Node.js 调试
node --inspect ./node_modules/.bin/electron .
```

### 2. 构建优化

```bash
# 分析构建大小
pnpm run build:vite -- --analyze
```

### 3. 运行时优化

- 使用 React DevTools 检查组件性能
- 使用 Chrome DevTools 的 Performance 标签分析性能

## 部署指南

### 1. 生成发布版本

```bash
# 构建生产版本
pnpm run build

# 打包应用
pnpm run package
```

### 2. 发布到 GitHub Releases

```bash
# 使用 electron-builder 自动发布
pnpm run package -- --publish always
```

### 3. 自动更新

应用已内置自动更新功能，用户启动时会自动检查更新。

## 获取帮助

### 查看项目文档

- `docs/QUICK_START.md` - 快速开始指南
- `docs/PROJECT_STATUS.md` - 项目状态
- `docs/ENTERPRISE_COMPLETION.md` - 企业级完成度
- `docs/FINAL_DEPLOYMENT_GUIDE.md` - 部署指南

### 常用命令速查

```bash
# 快速开发
pnpm run dev

# 类型检查
pnpm run type-check

# 代码格式化
pnpm run format

# 构建
pnpm run build

# 打包
pnpm run package
```

## 下一步

1. **启动开发环境**：`pnpm run dev`
2. **查看应用界面**：Electron 窗口会自动打开
3. **修改代码**：编辑 `src/` 或 `electron/` 目录下的文件
4. **提交更改**：使用 Git 提交代码
5. **构建发布**：`pnpm run build && pnpm run package`

祝你开发愉快！🚀

