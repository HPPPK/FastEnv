/**
 * 全局设置页面
 * 设置通过主进程持久化到用户数据目录，应用重启后继续生效。
 */

import React, { useEffect, useState } from 'react';
import { Download, FileText, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import type { AppSettings, LogEntry } from '../types';
import { envguardApi } from '../api/envguard';
import { createDefaultSettings, useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';

export default function Settings(): JSX.Element {
  const { config, setConfig } = useSettingsStore();
  const { addNotification, setTheme } = useUIStore();
  const [draft, setDraft] = useState<AppSettings>(() => config ?? createDefaultSettings());
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logActionBusy, setLogActionBusy] = useState(false);

  useEffect(() => {
    if (config) {
      setDraft(config);
    }
  }, [config]);

  const updateDraft = (updates: Partial<AppSettings>): void => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const nextConfig = { ...draft, updatedAt: Date.now() };
      const result = await envguardApi.setConfig(nextConfig);
      if (!result.success) {
        throw new Error('设置保存失败');
      }
      setConfig(nextConfig);
      setTheme(nextConfig.theme);
      addNotification({
        type: 'success',
        title: '设置已保存',
        message: '新的设置将在当前应用和下次启动时生效。',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '设置保存失败',
        message: error instanceof Error ? error.message : '无法保存设置',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    const nextConfig = createDefaultSettings();
    setDraft(nextConfig);
    setSaving(true);
    try {
      const result = await envguardApi.setConfig(nextConfig);
      if (!result.success) {
        throw new Error('默认设置保存失败');
      }
      setConfig(nextConfig);
      setTheme(nextConfig.theme);
      addNotification({
        type: 'success',
        title: '已恢复默认设置',
        message: '默认设置已保存。',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '恢复默认设置失败',
        message: error instanceof Error ? error.message : '无法恢复默认设置',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfiguration = async (): Promise<void> => {
    try {
      const result = await envguardApi.exportConfiguration();
      if (result.success && result.exportedPath) {
        addNotification({ type: 'success', title: '配置已导出', message: result.exportedPath });
      }
    } catch (error) {
      addNotification({ type: 'error', title: '配置导出失败', message: error instanceof Error ? error.message : '无法导出配置' });
    }
  };

  const handleImportConfiguration = async (): Promise<void> => {
    setSaving(true);
    try {
      const result = await envguardApi.importConfiguration();
      if (result.success) {
        const importedConfig = result.config ?? await envguardApi.getConfig();
        setConfig(importedConfig);
        setDraft(importedConfig);
        setTheme(importedConfig.theme);
        addNotification({ type: 'success', title: '配置已导入', message: result.importedPath ?? '配置已恢复' });
      }
    } catch (error) {
      addNotification({ type: 'error', title: '配置导入失败', message: error instanceof Error ? error.message : '配置文件无效或无法读取' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadLogs = async (): Promise<void> => {
    setLoadingLogs(true);
    try {
      const result = await envguardApi.getLogs(200);
      setLogs(result.logs);
    } catch (error) {
      addNotification({ type: 'error', title: '日志读取失败', message: error instanceof Error ? error.message : '无法读取日志' });
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleClearLogs = async (): Promise<void> => {
    if (!window.confirm('确定清空 EnvGuard 本地日志吗？此操作不可恢复。')) return;
    setLogActionBusy(true);
    try {
      const result = await envguardApi.clearLogs();
      if (!result.success) throw new Error('日志清理失败');
      setLogs([]);
      addNotification({ type: 'success', title: '日志已清空', message: '本地日志文件已清理' });
    } catch (error) {
      addNotification({ type: 'error', title: '日志清理失败', message: error instanceof Error ? error.message : '无法清理日志' });
    } finally {
      setLogActionBusy(false);
    }
  };

  const handleExportLogs = async (): Promise<void> => {
    setLogActionBusy(true);
    try {
      const result = await envguardApi.exportLogs();
      if (result.success && result.exportedPath) {
        addNotification({ type: 'success', title: '日志已导出', message: result.exportedPath });
      }
    } catch (error) {
      addNotification({ type: 'error', title: '日志导出失败', message: error instanceof Error ? error.message : '无法导出日志' });
    } finally {
      setLogActionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">全局设置</h1>
        <p className="mt-2 text-muted-foreground">配置应用的全局参数和偏好设置</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">镜像源配置</h3>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Python 镜像源
              <input
                type="url"
                value={draft.mirrorPython ?? ''}
                onChange={(event) => updateDraft({ mirrorPython: event.target.value })}
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="mt-1 block text-xs text-muted-foreground">用于 pip 包管理器。</span>
            </label>
            <label className="block text-sm font-medium text-foreground">
              NPM 镜像源
              <input
                type="url"
                value={draft.mirrorNpm ?? ''}
                onChange={(event) => updateDraft({ mirrorNpm: event.target.value })}
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="mt-1 block text-xs text-muted-foreground">用于 npm 包管理器。</span>
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">界面与备份</h3>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              主题
              <select
                value={draft.theme}
                onChange={(event) =>
                  updateDraft({ theme: event.target.value as AppSettings['theme'] })
                }
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="dark">深色</option>
                <option value="light">浅色</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.autoBackup}
                onChange={(event) => updateDraft({ autoBackup: event.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              修复前自动备份系统配置
            </label>
            <p className="text-xs text-muted-foreground">
              当前版本会持久化备份开关；配置导入导出已通过原生文件对话框接入，并在导入前校验文件结构。
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">日志设置</h3>
          <label className="block text-sm font-medium text-foreground">
            日志等级
            <select
              value={draft.logLevel}
              onChange={(event) =>
                updateDraft({ logLevel: event.target.value as AppSettings['logLevel'] })
              }
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="debug">调试 (Debug)</option>
              <option value="info">信息 (Info)</option>
              <option value="warn">警告 (Warn)</option>
              <option value="error">错误 (Error)</option>
            </select>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            日志查询、清理和导出已接入主进程；查询结果仅显示最近 200 条。
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">配置文件管理</h3>
          <p className="mb-4 text-sm text-muted-foreground">导出配置包含环境清单、修复记录和应用设置，不包含加密密钥。</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => void handleExportConfiguration()} disabled={saving} className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60">
              <Download size={16} /> 导出配置
            </button>
            <button onClick={() => void handleImportConfiguration()} disabled={saving} className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60">
              <Upload size={16} /> 导入配置
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">本地日志</h3>
              <p className="mt-1 text-xs text-muted-foreground">日志保存在用户目录的 .envguard/logs 中。</p>
            </div>
            <FileText size={20} className="text-muted-foreground" />
          </div>
          <div className="mb-4 flex flex-wrap gap-3">
            <button onClick={() => void handleLoadLogs()} disabled={loadingLogs} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {loadingLogs ? '读取中...' : '读取最近日志'}
            </button>
            <button onClick={() => void handleExportLogs()} disabled={logActionBusy} className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60">
              <Download size={16} /> 导出日志
            </button>
            <button onClick={() => void handleClearLogs()} disabled={logActionBusy} className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-background px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60">
              <Trash2 size={16} /> 清空日志
            </button>
          </div>
          <div className="max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-xs">
            {logs.length === 0 ? <p className="text-muted-foreground">尚未读取日志</p> : logs.map((log) => (
              <div key={log.id} className="border-b border-border/50 py-1 last:border-0">
                <span className="mr-2 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                <span className="mr-2 text-primary">{log.level.toUpperCase()}</span>
                <span className="mr-2 text-muted-foreground">[{log.module}]</span>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">关于应用</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">应用名称</span>
              <span className="font-medium text-foreground">EnvGuard</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">版本号</span>
              <span className="font-medium text-foreground">0.1.2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">配置存储</span>
              <span className="font-medium text-foreground">~/.envguard/data/settings.json</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? '保存中...' : '保存设置'}
          </button>
          <button
            onClick={() => void handleReset()}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={18} />
            恢复默认
          </button>
        </div>
      </div>
    </div>
  );
}
