/**
 * 全局设置页面
 * 设置通过主进程持久化到用户数据目录，应用重启后继续生效。
 */

import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import type { AppSettings } from '../types';
import { envguardApi } from '../api/envguard';
import { createDefaultSettings, useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';

export default function Settings(): JSX.Element {
  const { config, setConfig } = useSettingsStore();
  const { addNotification, setTheme } = useUIStore();
  const [draft, setDraft] = useState<AppSettings>(() => config ?? createDefaultSettings());
  const [saving, setSaving] = useState(false);

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
              当前版本会持久化备份开关；完整的配置导入导出仍需要后续 IPC 接入。
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
            日志查看器和导出功能将在日志 IPC 完整接入后启用。
          </p>
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
              <span className="font-medium text-foreground">0.1.0</span>
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
