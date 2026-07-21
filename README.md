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
- 🔍 **冲突智能检测** - 检测常见 PATH、版本、依赖和环境变量冲突
- ⚡ **冲突修复** - 提供修复方案预览、备份和回滚基础能力
- 📦 **依赖管理** - 隔离环境内依赖安装、升级、卸载
- 💾 **配置备份** - 本地加密存储，配置导入导出持续完善中
- 📊 **可视化管理** - 企业级 UI 设计，零学习成本

## 🛠 技术栈

### 前端

- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: TailwindCSS + React 本地业务组件（shadcn/ui 尚未引入）
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

## 📌 当前开发状态（2026-07-21）

当前版本是一个已经完成基础业务闭环、但仍在向企业级 MVP 演进的 Electron 应用。重点不是继续堆叠页面，而是把已有 UI、IPC 和主进程服务稳定地连接起来。

### 已完成并已验证

- TypeScript 类型检查通过。
- Vite renderer 构建通过。
- Electron 主进程 TypeScript 编译通过。
- ESLint 检查通过。
- Windows 开发启动脚本不再依赖 Unix 的 `env -u`，改为由 `scripts/start-electron-dev.js` 清理 `ELECTRON_RUN_AS_NODE`。
- 系统扫描、环境列表、环境创建、需求解析、冲突检测、修复记录和依赖安装 IPC 已接入。
- 冲突扫描页面已适配后端返回的 `{ conflicts, summary }` 结构，并增加修复方案预览。
- 设置页面已通过 `config:get` / `config:set` 持久化镜像源、主题、备份开关和日志等级。
- 依赖安装服务已通过 `dependency:install:progress` 向界面发送包级进度。
- Electron 运行时已通过 `.npmrc` 配置的国内镜像成功安装，开发模式已完成启动冒烟验证。
- 首页扫描缓存已增加稳定的缓存保护，Windows 环境扫描使用 `where.exe` 查找 Python/Node 等可执行文件。
- 需求解析已修复短关键词误匹配（例如 `go` 命中普通英文单词），并补充 Node.js 版本、React/TypeScript/Vite、Spring Boot/JUnit 等真实项目依赖识别。
- Node 依赖安装器在项目本地没有 npm 时会解析系统 PATH 中的绝对 npm 路径，兼容 Windows 普通 Node 项目。
- 已增加可重复执行的隔离安装/冲突测试脚本：`scripts/run-install-cases.cjs`。
- Tailwind 配置已改为 `tailwind.config.cjs`，Vite 配置已改为 `vite.config.mts`；Vite 构建不再输出 CJS API 和 Tailwind ESM 配置警告。
- 已完成全仓库 ESLint 治理：`any`、未使用变量/参数、直接 `console.log` 和缺少核心返回类型等 warning 已清理，当前 `pnpm run lint` 为 0 warning / 0 error。
- 测试脚本已改为显式调用 Windows `cmd.exe`，不再触发 Node.js `DEP0190`；同时已将环境 store 对 API 的动态导入改为静态导入，Vite 分包优化提示也已消除。
- Windows Python 启动器解析已修复：环境创建服务在 Windows 使用 `where.exe` 查找 Python，并过滤 `WindowsApps` 占位路径，避免真实创建流程误判 Python 不可用。
- 已完成一次真实 Windows UI 端到端验收：通过 UI 创建隔离 Python 3.14.6 环境 `e2e-ui-python-20260721`，在安装依赖页面实际安装 `colorama`，UI 日志显示安装成功，隔离环境内实测版本为 `colorama 0.4.6`。
- 端到端验收后的依赖重新统计显示 `colorama 0.4.6` 与 `pip 26.1.2`；随后已通过 UI 删除测试环境，环境数量恢复为 2 个，测试目录已清理，5173 开发端口已释放。

### 仍在开发中

- 图片 OCR、PDF/DOCX 解析尚未接入；当前新建环境支持文本和文本类文件，截图页仅接受 OCR 后的文本日志。
- “复用旧环境”目前只生成分析建议，不会自动修改或升级旧环境。
- 冲突修复仍需要继续强化平台级备份、权限提示和可验证回滚。
- 日志查看器、日志导出、配置导入导出尚未完成完整 IPC 链路。
- 仍需补充正式的自动化测试框架和 CI 测试；当前已提供本地可重复的隔离安装、需求解析和冲突检测验收脚本。
- Electron 安装器打包和跨平台发布验收仍未完成。
- 依赖安装成功后，详情页首次可能仍显示缓存的依赖清单；执行“重新统计依赖”后可显示最新包信息。自动刷新链路仍应继续强化。

### 推荐开发顺序

1. 完成真实环境创建和依赖安装的异常、取消、验证流程。
2. 接入 OCR/文档解析和文件选择 IPC。
3. 为系统冲突修复增加预览、二次确认、备份和回滚验证。
4. 补齐日志、配置导入导出和权限处理。
5. 增加自动化测试，再进行 Windows/macOS/Linux 打包验收。

`AGENTS.md` 是开发交接说明；若其中的状态描述与实际源码不一致，以实际源码和本节的验证结果为准。

## 🧪 模拟需求、真实安装与冲突测试

为避免污染用户全局 Python/Node 环境，项目提供了一个只在 .tmp-test/install-cases/ 下工作的验收脚本。它会创建临时 Python venv 和 Node 项目，执行真实的 pip/npm 命令，并在结束时输出 JSON 报告。

```powershell
pnpm run build:electron
node scripts/run-install-cases.cjs
```

本次在 Windows（Node.js 24.18.0、Python 3.14.6、npm 11.16.0）实际执行，结果如下：

| 类别             | 案例                                                         | 实际结果                                                              |
| ---------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| 模拟真实需求     | Python 3.12 + Django Web API，requests、pytest               | 解析成功：识别 Python、3.12、Django/requests/pytest                   |
| 模拟真实需求     | Node.js 20 + React/TypeScript/Vite，axios                    | 解析成功：识别 Node、20、React/TypeScript/Vite/axios                  |
| 模拟真实需求     | Java 17 + Spring Boot REST API，Maven/MySQL/JUnit            | 解析成功：识别 Java、17、Spring Boot/Maven/MySQL/JUnit                |
| 模拟真实需求     | Python 3.12 FastAPI 后端 + Node.js 20 React 前端             | 解析成功：识别 Python + Node、两个版本和核心依赖                      |
| 真实成功安装     | 隔离 Python venv 安装 `colorama==0.4.6`                      | 成功；pip 安装结果和包扫描均验证通过                                  |
| 真实成功安装     | 隔离 Node 项目安装 `is-number@7.0.0`                         | 成功；npm 安装结果、`node_modules` 和包扫描均验证通过                 |
| 真实 Python 冲突 | 同一次 pip 命令请求 `requests==2.28.0` 与 `requests==2.31.0` | 按预期失败，返回 `ResolutionImpossible`                               |
| 真实 Node 冲突   | 同一次 npm 命令请求 `react@17.0.2` 与 `react-dom@18.2.0`     | 按预期失败，返回 `ERESOLVE`，因为 react-dom 要求 peer react `^18.2.0` |
| 项目冲突检测模拟 | 两个 Python 版本、同环境两个 numpy 版本、重复 PATH           | 检测到 `duplicate_path`、`version_mismatch`、`dependency_conflict`    |

真实冲突的关键输出：

- pip：`Cannot install requests==2.28.0 and requests==2.31.0 ... ResolutionImpossible`
- npm：`ERESOLVE unable to resolve dependency tree`，`react-dom@18.2.0` 要求 `react@^18.2.0`

注意：当前 `EnvironmentInstaller.installPackages` 为逐个包安装流程，因此把同一个包的两个互斥版本放在 `packages` 数组中会被逐次处理，不能代表一次依赖树求解。上面的 Python/npm 冲突案例是直接调用 pip/npm 的“同一次解析”命令，专门验证真实解析器冲突；`--force` 或 `--legacy-peer-deps` 只能绕过约束，不属于冲突修复。

测试报告默认写入：

```
.tmp-test/install-cases/report.json
```

测试目录是临时目录，可在确认不再需要报告后删除；不要把测试依赖安装到系统 Python 或全局 npm。

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
└── scripts/               # 打包脚本
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x LTS
- npm >= 9.x 或 pnpm >= 8.x
- Python 3.8+ (可选，用于 Python 环境管理)

### 安装依赖

项目已在 `.npmrc` 中配置 Electron 国内镜像，首次安装会优先从 npmmirror 下载 Electron 运行时。

Windows 如果提示找不到 `pnpm`，请先关闭当前 PowerShell，重新打开一个 PowerShell 窗口，让用户 PATH 更新生效。验证命令：

```powershell
pnpm --version
node --version
```

如果仍未生效，可在当前窗口临时加入本机运行时路径：

```powershell
$env:Path = "C:\Users\潘婧瑜\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\潘婧瑜\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;$env:Path"
pnpm --version
```

安装依赖：

```bash
pnpm install
```

### 开发模式

```bash
# 安装依赖
pnpm install

# 启动 Vite + Electron 开发模式
pnpm run dev

# 只启动 Vite
pnpm run dev:vite

# Vite 已启动后单独启动 Electron
pnpm run dev:electron
```

### 构建打包

```bash
# 构建 renderer 和 Electron 主进程
pnpm run build

# 分开构建
pnpm run build:vite
pnpm run build:electron

# 构建当前平台安装包
pnpm run pack

# 生成发布包并执行 electron-builder
pnpm run dist
```

## 📖 使用指南

### 首次使用

1. 打开应用后，点击"一键体检"扫描系统环境
2. 查看已有环境列表和冲突提示
3. 根据需要创建新环境或修复冲突

### 创建新环境

1. 点击"新建环境"按钮
2. 输入项目需求或上传文本类文档
3. 应用自动分析并推荐最优方案（图片 OCR 和 PDF/DOCX 解析待接入）
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
4. 实时查看每个依赖的安装进度和结果
5. 安装完成后刷新环境信息

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

渲染层应通过 `src/api/envguard.ts` 调用 IPC，不要直接访问 `window.ipcRenderer`。

#### 系统扫描

```typescript
// 扫描系统环境
await envguardApi.scanSystem() -> SystemScanResult

// 获取环境列表
await envguardApi.listEnvironments() -> Environment[]
```

#### 环境管理

```typescript
// 创建环境
await envguardApi.createEnvironment({
  name: string,
  type: string,
  version: string,
  dependencies?: string[]
}) -> Environment

// 安装依赖
await envguardApi.installDependency(path, type, packages, operationId)
envguardApi.onDependencyInstallProgress(callback)
```

#### 冲突修复

```typescript
// 检测冲突
await envguardApi.detectConflicts() -> { conflicts, summary }

// 修复冲突
await envguardApi.fixConflicts() -> { repairRecord, success }

// 获取和保存设置
await envguardApi.getConfig()
await envguardApi.setConfig(config)
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

当前日志服务和 `log:get` IPC 仍在完善中。环境配置和修复记录存储在用户目录 `~/.envguard/data/`，设置文件为 `settings.json`。

在 Windows PowerShell 中可以先检查数据目录：

```powershell
Get-ChildItem "$HOME\.envguard\data"
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
