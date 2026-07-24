# 配置与日志 IPC 闭环

更新时间：2026-07-23

## 已实现

- config:export：通过 Electron 原生保存对话框导出环境清单、修复记录和应用设置。
- config:import：通过原生打开对话框选择 JSON；导入前校验根结构、数组和设置字段，写入失败会恢复导入前快照。
- log:get：读取当前及轮转日志文件，解析最近最多 1000 条结构化日志。
- log:clear：只清理 .envguard/logs 下的 envguard-*.log 文件。
- log:export：通过原生保存对话框导出全部 EnvGuard 日志。
- 设置页已提供配置导入/导出、日志读取/导出/清空操作。

## 安全边界

- 配置导出不包含 .envguard/.key 加密密钥。
- 导入不会执行依赖安装，也不会写入系统 PATH、注册表或 shell profile。
- 导入失败会尝试恢复环境、修复记录和设置的导入前快照。
- 日志清理限定在 EnvGuard 自有日志文件名范围内，避免误删同目录中的其他文件。
- 文件路径由 Electron 原生对话框返回；渲染进程不能直接访问本地文件系统。

## 验证

~~~bash
pnpm run type-check
pnpm run build:electron
pnpm run test:config-log
~~~

测试命令 test:config-log 使用临时目录，覆盖结构化日志查询、日志导出/清理、配置导出/导入和无效配置拒绝，不修改真实用户配置。

## 当前限制

- 日志解析针对 EnvGuard 当前文本日志格式；多行堆栈仍以原始日志文件为准。
- 配置导入是完整快照替换，不提供逐环境选择性导入。
- 原生文本 file:pick 已接入；PDF/DOCX 提取和真实图片 OCR 仍属于后续 P2 工作。
