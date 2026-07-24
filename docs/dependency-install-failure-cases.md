# 依赖安装异常闭环

更新时间：2026-07-24

## 已完成

- 安装前读取依赖快照，安装后再次读取依赖快照。
- 记录 before/after 清单、实际新增包、回滚候选包和一致性校验结果。
- 对网络失败、权限失败、npm peer conflict、命令失败进行分类。
- 支持多包安装部分成功时分别记录 installed、failed 和 failureReasons。
- 不会自动卸载所有已安装包；rollbackCandidatePackages 只提供后续人工确认或安全回滚使用。
- 安装页面显示失败分类和安装后一致性未确认提醒。
- 取消流程保留现有 AbortController、Windows taskkill 进程树清理和取消进度事件。

## 回归命令

~~~powershell
pnpm run test:install-failures
pnpm run test:install-cancel
node scripts/run-install-cases.cjs
~~~

异常测试使用隔离的模拟 npm CLI，不修改用户真实环境；run-install-cases.cjs 继续覆盖临时 Python/Node 环境的真实成功与冲突场景。

## 仍有限制

- 当前还没有对真实权限不足、真实断网和真实磁盘空间不足做稳定的跨平台自动化注入。
- Python/Java/Go 的失败注入覆盖还需要补充；本轮模拟异常重点覆盖 Node/npm。
- 回滚候选包目前只记录，不执行自动卸载；正式回滚需要安装前清单、依赖关系和用户二次确认。
