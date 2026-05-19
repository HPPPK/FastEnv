# EnvGuard - 企业级开发环境管理平台

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## 📋 项目简介

EnvGuard 是一款企业级开发环境管理平台，致力于解决开发者在多语言、多版本、多项目环境下的配置混乱、冲突频繁、排错困难等痛点问题。

### 核心特性

- 🎯 **全自动环境扫描** - 一键扫描系统内所有开发环境
- 🔧 **智能需求解析** - 自然语言理解项目需求，自动推荐最优环境方案
- 🚀 **一键环境创建** - 无需命令行，自动创建隔离虚拟环境
- 🔍 **冲突智能检测** - 检测 99% 常见环境冲突问题
- ⚡ **一键自动修复** - 企业级修复方案，支持完整回滚
- 📦 **依赖管理** - 隔离环境内依赖安装、升级、卸载
- 💾 **配置备份** - 本地加密存储，支持导入导出
- 📊 **可视化管理** - 企业级 UI 设计，零学习成本

## 🛠 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: shadcn/ui + TailwindCSS
- **图标**: lucide-react
- **构建工具**: Vite

### 后端
- **运行时**: Node.js + TypeScript
- **桌面框架**: Electron
- **日志系统**: 企业级分级日志
- **数据存储**: 本地加密 JSON 配置

### 开发工具
- **代码规范**: ESLint + Prettier
- **打包工具**: electron-builder
- **包管理**: npm/pnpm

## 📁 项目结构

```
env-guard/
├── electron/              # Electron 主进程代码
│   ├── main/              # 主进程核心逻辑
│   ├── preload/           # 预加载脚本、IPC 桥接
│   └── ipc/               # IPC 通信接口管理
├── src/                   # 前端 React 渲染层
│   ├── assets/            # 静态资源
│   ├── components/        # 业务组件
│   ├── pages/             # 页面路由
│   ├── store/             # 全局状态管理
│   ├── hooks/             # 自定义 hooks
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   └── api/               # IPC 请求封装
├── service/               # 后端核心业务服务
│   ├── env-scan/          # 系统环境扫描
│   ├── env-create/        # 虚拟环境创建
│   ├── env-install/       # 依赖包安装
│   ├── env-conflict/      # 冲突检测与修复
│   ├── demand-parse/      # 需求解析
│   ├── logger/            # 日志系统
│   └── storage/           # 数据持久化
├── config/                # 全局配置
├── scripts/               # 打包脚本
└── docs/                  # 项目文档
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x LTS
- npm >= 9.x 或 pnpm >= 8.x
- Python 3.8+ (可选，用于 Python 环境管理)

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev

# 启动 Electron 开发模式
npm run electron:dev
```

### 构建打包

```bash
# 构建所有平台
npm run build

# 构建特定平台
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 📖 使用指南

### 首次使用

1. 打开应用后，点击"一键体检"扫描系统环境
2. 查看已有环境列表和冲突提示
3. 根据需要创建新环境或修复冲突

### 创建新环境

1. 点击"新建环境"按钮
2. 输入项目需求（支持文本、文档、截图）
3. 应用自动分析并推荐最优方案
4. 确认后自动创建隔离虚拟环境

### 修复环境冲突

1. 进入"冲突修复"页面
2. 点击"扫描冲突"检测系统问题
3. 查看冲突详情和修复建议
4. 点击"一键修复"自动处理所有冲突
5. 修复完成后可查看修复报告

### 管理依赖

1. 选择目标环境
2. 点击"安装依赖"
3. 输入包名或功能描述
4. 实时查看安装进度
5. 安装完成自动验证

## 🔧 配置说明

### 全局设置

在"设置"页面可配置：

- **镜像源**: 国内加速镜像源配置
- **存储路径**: 虚拟环境默认存放目录
- **日志级别**: debug/info/warn/error
- **自动备份**: 修复前自动备份系统配置
- **主题**: 深色/浅色主题切换

### 环境变量

应用使用以下环境变量：

```bash
ENVGUARD_LOG_LEVEL=info          # 日志级别
ENVGUARD_DATA_DIR=~/.envguard    # 数据存储目录
ENVGUARD_MIRROR_PY=...           # Python 镜像源
ENVGUARD_MIRROR_NPM=...          # NPM 镜像源
```

## 📝 API 文档

### IPC 通信接口

#### 系统扫描

```typescript
// 扫描系统环境
ipcRenderer.invoke('system:scan') -> SystemScanResult

// 获取环境列表
ipcRenderer.invoke('env:list') -> Environment[]
```

#### 环境管理

```typescript
// 创建环境
ipcRenderer.invoke('env:create', {
  name: string
  type: EnvironmentType
  version: string
}) -> Environment

// 删除环境
ipcRenderer.invoke('env:delete', envId: string) -> boolean

// 激活环境
ipcRenderer.invoke('env:activate', envId: string) -> boolean
```

#### 冲突修复

```typescript
// 检测冲突
ipcRenderer.invoke('conflict:detect') -> EnvironmentConflict[]

// 修复冲突
ipcRenderer.invoke('conflict:repair', conflicts: EnvironmentConflict[]) -> RepairRecord

// 回滚修复
ipcRenderer.invoke('conflict:rollback', recordId: string) -> boolean
```

## 🐛 故障排除

### 常见问题

**Q: 应用无法扫描到 Python 环境？**
A: 确保 Python 已添加到系统 PATH，或在设置中手动指定 Python 路径。

**Q: 创建虚拟环境失败？**
A: 检查磁盘空间和权限，确保有足够的写入权限。

**Q: 修复后环境仍有问题？**
A: 查看修复日志了解详情，或使用"回滚"功能恢复原始配置。

### 日志查看

日志文件位置：`~/.envguard/logs/`

```bash
# 查看最新日志
tail -f ~/.envguard/logs/envguard-$(date +%Y-%m-%d).log

# 导出所有日志
npm run logs:export
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 添加必要的类型定义
- 编写清晰的提交信息

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 📞 联系方式

- 📧 Email: support@fastenv.com
- 🐛 Issue: [GitHub Issues](https://github.com/fastenv/fastenv/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/fastenv/fastenv/discussions)

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**Made with ❤️ by FastEnv Team**
