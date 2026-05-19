/**
 * 环境详情页面
 * 展示环境的完整配置、依赖清单、使用教程等
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Download, RefreshCw, AlertCircle, CheckCircle, Edit2, Save } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useEnvStore } from '../store/envStore';
import { envguardApi } from '../api/envguard';
import type { Environment, Dependency } from '../types';

interface EnvironmentInfo extends Environment {
  lastRepair?: string;
  repairCount: number;
  dependencies: Dependency[];
}

export default function EnvDetail(): JSX.Element {
  const { setCurrentPage, selectedEnvironment, setSelectedEnvironment, addNotification } = useUIStore();
  const { updateEnvironment } = useEnvStore();
  const [activeTab, setActiveTab] = useState<'config' | 'dependencies' | 'tutorial' | 'history'>('config');
  const [loading, setLoading] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [projectNoteDraft, setProjectNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (selectedEnvironment) {
      const envInfo: EnvironmentInfo = {
        ...selectedEnvironment,
        repairCount: 0,
      };
      setEnvironment(envInfo);
      setProjectNoteDraft(selectedEnvironment.projectNote ?? '');
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [selectedEnvironment]);

  const handleRefresh = async () => {
    if (!environment) return;

    setRefreshing(true);
    try {
      const dependencies = await envguardApi.getInstalledPackages(
        environment.path,
        environment.type
      );
      const refreshed = {
        ...environment,
        dependencies,
        updatedAt: Date.now(),
      };
      setEnvironment(refreshed);
      setSelectedEnvironment(refreshed);
      updateEnvironment(environment.id, {
        dependencies,
        updatedAt: refreshed.updatedAt,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportConfig = async () => {
    if (!environment) return;

    try {
      const result = await envguardApi.exportRequirements({
        environmentName: environment.name,
        environmentPath: environment.path,
        environmentType: environment.type,
        dependencies: environment.dependencies,
      });

      if (result.canceled) {
        return;
      }

      if (result.success) {
        addNotification({
          type: 'success',
          title: '导出成功',
          message: result.exportedPath
            ? `依赖配置已保存到 ${result.exportedPath}`
            : '依赖配置已保存',
          duration: 5000,
        });
        return;
      }

      addNotification({
        type: 'error',
        title: '导出失败',
        message: '未能保存依赖配置文件',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '导出失败',
        message: error instanceof Error ? error.message : '未能保存依赖配置文件',
      });
    }
  };

  const handleSaveProjectNote = async () => {
    if (!environment) return;

    setSavingNote(true);
    try {
      const updated = await envguardApi.updateEnvironment(environment.id, {
        projectNote: projectNoteDraft.trim(),
      });
      const next = {
        ...environment,
        projectNote: updated.projectNote,
        updatedAt: updated.updatedAt,
      };
      setEnvironment(next);
      setSelectedEnvironment(next);
      updateEnvironment(environment.id, {
        projectNote: updated.projectNote,
        updatedAt: updated.updatedAt,
      });
      setEditingNote(false);
      addNotification({
        type: 'success',
        title: '项目描述已保存',
        message: `${environment.name} 的项目描述已更新。`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '保存失败',
        message: error instanceof Error ? error.message : '无法保存项目描述',
      });
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载环境详情中...</p>
        </div>
      </div>
    );
  }

  if (!environment) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-destructive" />
          <p className="text-muted-foreground">环境不存在</p>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    healthy: { color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950', label: '正常' },
    warning: { color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950', label: '警告' },
    error: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950', label: '异常' },
  };

  const status = statusConfig[environment.status] || statusConfig.healthy;

  return (
    <div className="space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentPage('home')}
          className="rounded-lg border border-input bg-background p-2 text-foreground hover:bg-muted"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{environment.name}</h1>
          <p className="mt-1 text-sm text-foreground">
            {environment.type.toUpperCase()} {environment.version}
          </p>
        </div>
      </div>

      {/* 环境状态卡片 */}
      <div className={`rounded-lg border border-border ${status.bg} p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className={`h-6 w-6 ${status.color}`} />
            <div>
              <p className="font-semibold text-foreground">环境状态</p>
              <p className={`text-sm ${status.color}`}>{status.label}</p>
            </div>
          </div>
          <div className="text-right text-sm text-foreground">
            <p>创建时间: {new Date(environment.createdAt).toLocaleDateString('zh-CN')}</p>
            <p>修复次数: {environment.repairCount}</p>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          {(['config', 'dependencies', 'tutorial', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 font-medium transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'config' && '配置信息'}
              {tab === 'dependencies' && '依赖清单'}
              {tab === 'tutorial' && '使用教程'}
              {tab === 'history' && '修复历史'}
            </button>
          ))}
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="space-y-6">
        {/* 配置信息 */}
        {activeTab === 'config' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">环境配置</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <div>
                  <p className="text-sm text-muted-foreground">环境路径</p>
                  <p className="font-mono text-foreground">{environment.path}</p>
                </div>
                <button className="rounded-lg border border-input bg-background p-2 text-foreground hover:bg-muted">
                  <Copy size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">语言类型</p>
                  <p className="font-semibold text-foreground">{environment.type.toUpperCase()}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">版本号</p>
                  <p className="font-semibold text-foreground">{environment.version}</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">项目描述</p>
                  {editingNote ? (
                    <button
                      onClick={handleSaveProjectNote}
                      disabled={savingNote}
                      className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <Save size={16} />
                      {savingNote ? '保存中...' : '保存'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingNote(true)}
                      className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <Edit2 size={16} />
                      编辑
                    </button>
                  )}
                </div>

                {editingNote ? (
                  <textarea
                    value={projectNoteDraft}
                    onChange={(event) => setProjectNoteDraft(event.target.value)}
                    placeholder="添加这个环境对应的项目用途、数据来源、运行入口或注意事项..."
                    className="min-h-28 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {environment.projectNote || '暂无项目描述'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 依赖清单 */}
        {activeTab === 'dependencies' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">已安装依赖 ({environment.dependencies.length})</h3>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw size={16} className={`inline mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? '统计中...' : '重新统计'}
              </button>
            </div>
            <div className="space-y-2">
              {environment.dependencies.length > 0 ? (
                environment.dependencies.map((dep, idx) => (
                  <div key={`${dep.name}-${idx}`} className="flex items-center justify-between rounded-lg bg-muted p-3">
                    <span className="font-mono text-foreground">{dep.name}</span>
                    <span className="text-sm text-muted-foreground">{dep.version}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  暂未统计到依赖。点击“重新统计”会从当前环境的包管理器读取已安装库及版本。
                </div>
              )}
            </div>
          </div>
        )}

        {/* 使用教程 */}
        {activeTab === 'tutorial' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">快速开始</h3>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-semibold text-foreground">1. 激活环境</h4>
                <div className="rounded-lg bg-muted p-4">
                  <code className="font-mono text-sm text-foreground">
                    source {environment.path}/bin/activate
                  </code>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-foreground">2. 验证环境</h4>
                <div className="rounded-lg bg-muted p-4">
                  <code className="font-mono text-sm text-foreground">
                    python --version
                  </code>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-foreground">3. 安装新依赖</h4>
                <div className="rounded-lg bg-muted p-4">
                  <code className="font-mono text-sm text-foreground">
                    pip install package-name
                  </code>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-foreground">4. 退出环境</h4>
                <div className="rounded-lg bg-muted p-4">
                  <code className="font-mono text-sm text-foreground">
                    deactivate
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 修复历史 */}
        {activeTab === 'history' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">修复历史</h3>
            {environment.lastRepair ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">最后修复</p>
                      <p className="text-sm text-muted-foreground">{environment.lastRepair}</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  共进行了 {environment.repairCount} 次修复操作
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">暂无修复记录</p>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '统计中...' : '重新统计依赖'}
        </button>
        <button
          onClick={handleExportConfig}
          className="flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 font-medium text-foreground hover:bg-muted"
        >
          <Download size={18} />
          导出配置
        </button>
      </div>
    </div>
  );
}
