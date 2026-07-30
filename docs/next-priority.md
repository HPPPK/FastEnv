# FastEnv 下一阶段优先级

更新时间：2026-07-30

## 已完成

- Windows 系统级 PATH 一次性提权助手和 UI 端到端验证
- 依赖安装进度 IPC、取消 IPC 和子进程终止
- 配置导入导出、日志查询/清理/导出基础 IPC/UI 闭环
- 安装前后依赖清单、失败分类、部分成功状态和回归脚本
- 原生需求文本文件选择和 10 MB 文本读取校验
- Windows x64 NSIS/Portable v0.1.4 发布（未签名）

## 当前行动顺序（暂不处理 macOS）

### P0：先完成交付链路

已完成当前 Windows 交付链路：修复 CI、提交并推送 v0.1.4，发布 Windows 安装资产；GitHub Actions run 30092927038 的 Windows、macOS、Linux 矩阵验证全部通过。

### P1：依赖安装真实异常验收

继续在 Windows 隔离环境验证真实断网、权限不足、磁盘空间不足和多包中途失败；保留安装前清单，不做无条件卸载。

### P1：文档解析能力

在原生 file:pick 基础上接入 PDF/DOCX 文本提取和真实图片 OCR；完成预览、解析失败、重试和用户确认。

### P2：环境变量事务

扩展 PYTHONPATH、JAVA_HOME、GOROOT、GOPATH，支持用户级/系统级作用域和可回放 rollback。

### P2：测试体系

补充正式单元测试、IPC 测试、renderer 测试、Electron UI E2E、并发和压力测试。

### P3：Windows 产品化

补充自动更新、启动集成、右键菜单、签名和安装器 UX。macOS/Linux 打包与真实系统验收暂缓。
