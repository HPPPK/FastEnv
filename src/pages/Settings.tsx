/**
 * 全局设置页面
 * 配置应用全局设置、镜像源、日志等
 */

import React, { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';

export default function Settings(): JSX.Element {
  const [mirrorPython, setMirrorPython] = useState('https://mirrors.aliyun.com/pypi/simple/');
  const [mirrorNpm, setMirrorNpm] = useState('https://registry.npmmirror.com');
  const [autoBackup, setAutoBackup] = useState(true);
  const [logLevel, setLogLevel] = useState('info');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">全局设置</h1>
        <p className="mt-2 text-muted-foreground">
          配置应用的全局参数和偏好设置
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* 镜像源配置 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">镜像源配置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Python 镜像源
              </label>
              <input
                type="text"
                value={mirrorPython}
                onChange={(e) => setMirrorPython(e.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                用于 pip 包管理器的镜像源地址
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                NPM 镜像源
              </label>
              <input
                type="text"
                value={mirrorNpm}
                onChange={(e) => setMirrorNpm(e.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                用于 npm 包管理器的镜像源地址
              </p>
            </div>
          </div>
        </div>

        {/* 备份与恢复 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">备份与恢复</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => setAutoBackup(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm text-foreground">
                修复前自动备份系统配置
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              启用此选项后，在执行任何系统修复操作前会自动备份当前配置
            </p>

            <div className="flex gap-2 pt-2">
              <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <RotateCcw size={16} />
                导出配置
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                导入配置
              </button>
            </div>
          </div>
        </div>

        {/* 日志设置 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">日志设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                日志等级
              </label>
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="debug">调试 (Debug)</option>
                <option value="info">信息 (Info)</option>
                <option value="warn">警告 (Warn)</option>
                <option value="error">错误 (Error)</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                选择要记录的最低日志级别
              </p>
            </div>

            <button className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              查看日志文件
            </button>
          </div>
        </div>

        {/* 关于应用 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">关于应用</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">应用名称</span>
              <span className="font-medium text-foreground">EnvGuard</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">版本号</span>
              <span className="font-medium text-foreground">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">构建时间</span>
              <span className="font-medium text-foreground">2024-05-17</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">
            <Save size={18} />
            保存设置
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 font-medium text-foreground hover:bg-muted">
            <RotateCcw size={18} />
            恢复默认
          </button>
        </div>
      </div>
    </div>
  );
}
