# 跨平台验证说明

## 当前状态（2026-07-23）

Windows 的系统级 PATH 一次性提权助手已经完成真实 UAC 与 UI 端到端验证。macOS/Linux 目前已完成代码路径和协议隔离测试，但尚未声称完成真实系统级写入验收。

工作流会先通过 pnpm/action-setup 安装仓库声明的 pnpm 版本，再启用 Node.js 的 pnpm 缓存；这样三种 runner 在缓存初始化阶段就能找到 pnpm。

本项目新增 GitHub Actions 矩阵：

- windows-latest
- macos-14
- ubuntu-24.04

每个平台都会执行：

1. TypeScript 类型检查
2. Electron 主进程编译
3. 提权协议白名单、平台和篡改检测
4. 依赖安装取消回归测试
5. 配置与日志 IPC 隔离回归测试
6. 依赖安装异常回归测试
7. 文件读取隔离回归测试

CI 不会修改真实的 Windows 注册表、macOS 的 /etc/paths.d 或 Linux 的 /etc/profile.d。它验证的是协议边界、编译产物和可取消的子进程行为。

Unix runner 的取消回归会以独立进程组启动模拟安装，并发送进程组终止信号，并在必要时强制结束进程组，避免只结束 shell 而遗留 sleep 子进程。

## 真实平台验收矩阵

| 平台    | UAC/授权取消  | 成功写入      | 写入后校验    | 失败回滚       | 当前结论           |
| ------- | ------------- | ------------- | ------------- | -------------- | ------------------ |
| Windows | 已验证        | 已验证        | 已验证        | 已验证代码路径 | 可发布 Windows MVP |
| macOS   | 待 macOS 实机 | 待 macOS 实机 | 待 macOS 实机 | 待 macOS 实机  | 不能声称完成       |
| Linux   | 待 Linux 实机 | 待 Linux 实机 | 待 Linux 实机 | 待 Linux 实机  | 不能声称完成       |

## macOS/Linux 手动验收要求

必须使用隔离测试账号或临时虚拟机，并记录：

- 用户点击取消后的返回值和配置差异
- 授权成功后的目标文件内容
- 写入后的新 Shell 读取结果
- 写入失败时的回滚结果
- 备份目录和结果文件没有符号链接穿透
- 应用退出后重新启动仍能读取正确状态

不要在开发机的真实全局 profile 中直接运行未审阅的任意 PATH 写入测试。


配置与日志回归由 scripts/run-config-log-cases.cjs 执行，使用临时目录验证日志查询/导出/清理和配置快照导入/回滚，不接触用户真实数据。

依赖安装异常回归使用 scripts/run-install-failure-cases.cjs，验证网络、权限、peer conflict、部分成功和 before/after 清单。文件读取回归使用 scripts/run-file-ingest-cases.cjs，验证文本扩展名和 10 MB 限制。
