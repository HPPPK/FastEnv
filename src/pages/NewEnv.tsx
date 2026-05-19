/**
 * 新建环境页面
 * 支持三种需求录入方式
 */

import React, { useEffect, useState } from 'react';
import { Plus, Upload, Image, XCircle } from 'lucide-react';
import { envguardApi, type CreateEnvironmentProgress } from '../api/envguard';
import { useEnvStore } from '../store/envStore';
import { useUIStore } from '../store/uiStore';
import type { DemandParseResult } from '../types';

export default function NewEnv(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'text' | 'document' | 'screenshot'>('text');
  const [envName, setEnvName] = useState('');
  const [requirement, setRequirement] = useState('');
  const [createMode, setCreateMode] = useState<'new' | 'reuse'>('new');
  const [analysis, setAnalysis] = useState<DemandParseResult | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState<CreateEnvironmentProgress | null>(null);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const { environments, addEnvironment } = useEnvStore();
  const { addNotification, setCurrentPage } = useUIStore();

  useEffect(() => {
    return envguardApi.onCreateEnvironmentProgress((progress) => {
      setCreateProgress((current) => {
        if (progress.progress === 0 && current) {
          return { ...current, message: progress.message };
        }
        return progress;
      });
      setProgressLogs((logs) => {
        const next = [...logs, progress.message].filter(Boolean);
        return next.slice(-8);
      });
    });
  }, []);

  const handleFileInput = async (file: File): Promise<void> => {
    const content = await file.text();
    setRequirement(content);
  };

  const handleCreate = async (): Promise<void> => {
    if (!requirement.trim()) {
      addNotification({
        type: 'warning',
        title: '缺少需求说明',
        message: '请先输入文本需求或上传可读取的文档内容。',
      });
      return;
    }

    setSubmitting(true);
    const currentOperationId = `env-create-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOperationId(currentOperationId);
    setCreateProgress({
      operationId: currentOperationId,
      stage: 'preparing',
      progress: 1,
      message: '正在解析需求...',
    });
    setProgressLogs(['正在解析需求...']);
    try {
      const parsed = await envguardApi.parseDemand({
        type: activeTab === 'screenshot' ? 'image' : activeTab,
        content: requirement,
      });
      setAnalysis(parsed);

      const recommendation = parsed.recommendation as
        | { primaryLanguage?: string; recommendedVersion?: string }
        | undefined;
      const type = recommendation?.primaryLanguage ?? parsed.detectedTypes?.[0] ?? 'python';
      const versions = parsed.versions as Record<string, string> | undefined;
      const version = recommendation?.recommendedVersion ?? versions?.[String(type)] ?? 'latest';
      const dependencies = Array.from(
        new Set([
          ...(parsed.dependencies ?? []),
          ...(parsed.requiredDependencies ?? []),
          ...(((recommendation as { suggestedDependencies?: string[]; dependencies?: string[] } | undefined)?.suggestedDependencies) ?? []),
          ...(((recommendation as { suggestedDependencies?: string[]; dependencies?: string[] } | undefined)?.dependencies) ?? []),
        ])
      );

      if (createMode === 'reuse') {
        addNotification({
          type: 'info',
          title: '已生成复用建议',
          message: '复用旧环境的自动升级策略已解析，后续会接入安全变更预览。',
        });
        return;
      }

      const environment = await envguardApi.createEnvironment({
        name: envName.trim() || parsed.suggestedEnvironmentName || `${type}-${Date.now().toString(36)}`,
        type: String(type),
        version: String(version),
        tags: [String(type), 'managed'],
        projectNote: requirement.slice(0, 160),
        dependencies,
        operationId: currentOperationId,
      });

      addEnvironment(environment);
      addNotification({
        type: 'success',
        title: '环境创建完成',
        message: `${environment.name} 已保存到本地环境列表。`,
      });
      setCurrentPage('home');
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      if (message.includes('操作已取消')) {
        addNotification({
          type: 'info',
          title: '创建已取消',
          message: '环境创建任务已终止。',
        });
        return;
      }
      addNotification({
        type: 'error',
        title: '环境创建失败',
        message,
      });
    } finally {
      setSubmitting(false);
      setOperationId(null);
    }
  };

  const handleCancelCreate = async (): Promise<void> => {
    if (!operationId) return;

    try {
      await envguardApi.cancelEnvironmentCreation(operationId);
      setCreateProgress({
        operationId,
        stage: 'cancelled',
        progress: createProgress?.progress ?? 0,
        message: '正在取消当前创建任务...',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '取消失败',
        message: error instanceof Error ? error.message : '无法取消当前任务',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">新建开发环境</h1>
        <p className="mt-2 text-muted-foreground">
          通过智能需求解析快速创建隔离的开发环境
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：需求输入 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 环境名称 */}
          <div className="rounded-lg border border-border bg-card p-6">
            <label className="block text-sm font-medium text-foreground">
              环境名称
            </label>
            <input
              type="text"
              value={envName}
              onChange={(e) => setEnvName(e.target.value)}
              placeholder="例如：my-python-project"
              className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 需求输入方式选择 */}
          <div className="rounded-lg border border-border bg-card p-6">
            <label className="block text-sm font-medium text-foreground mb-4">
              需求录入方式
            </label>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                  activeTab === 'text'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <Plus size={18} />
                文本输入
              </button>
              <button
                onClick={() => setActiveTab('document')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                  activeTab === 'document'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <Upload size={18} />
                上传文档
              </button>
              <button
                onClick={() => setActiveTab('screenshot')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                  activeTab === 'screenshot'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <Image size={18} />
                上传截图
              </button>
            </div>

            {/* 文本输入 */}
            {activeTab === 'text' && (
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="描述你的项目需求，例如：需要 Python 3.10 + Django 4.0 + PostgreSQL..."
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={6}
              />
            )}

            {/* 文档上传 */}
            {activeTab === 'document' && (
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  className="mx-auto mt-4 block max-w-xs text-sm"
                  accept=".txt,.md,.json,.log"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFileInput(file);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  拖拽文件到此处或点击选择
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 .txt, .md, .pdf, .docx 等格式
                </p>
              </div>
            )}

            {/* 截图上传 */}
            {activeTab === 'screenshot' && (
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Image size={32} className="mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  className="mx-auto mt-4 block max-w-xs text-sm"
                  accept=".txt,.log,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && file.type.startsWith('text')) handleFileInput(file);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  拖拽图片到此处或点击选择
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 .jpg, .png, .gif 等格式
                </p>
              </div>
            )}
          </div>

          {/* 创建选项 */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              创建方式
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="create-mode"
                  checked={createMode === 'new'}
                  onChange={() => setCreateMode('new')}
                  className="h-4 w-4"
                />
                <span className="text-sm text-foreground">
                  创建新的独立虚拟环境（推荐）
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="create-mode"
                  checked={createMode === 'reuse'}
                  onChange={() => setCreateMode('reuse')}
                  className="h-4 w-4"
                />
                <span className="text-sm text-foreground">
                  复用本机旧环境并自动升级优化
                </span>
              </label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              disabled={isSubmitting}
              onClick={handleCreate}
              className="flex-1 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '正在处理...' : '智能分析并创建'}
            </button>
            <button className="rounded-lg border border-input bg-background px-6 py-3 font-medium text-foreground hover:bg-muted">
              取消
            </button>
          </div>

          {isSubmitting && createProgress && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">正在创建环境</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{createProgress.message}</p>
                </div>
                <button
                  onClick={handleCancelCreate}
                  className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <XCircle size={16} />
                  取消
                </button>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(1, Math.min(createProgress.progress || 1, 100))}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{createProgress.stage}</span>
                <span>{Math.round(createProgress.progress || 0)}%</span>
              </div>
              {progressLogs.length > 0 && (
                <div className="mt-4 max-h-40 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
                  {progressLogs.map((log, index) => (
                    <div key={`${index}-${log}`}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {analysis && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">解析结果</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                场景：{analysis.scenario ?? '未识别'} · 置信度：{Math.round((analysis.confidence ?? 0) * 100)}%
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                技术栈：{(analysis.detectedTypes ?? analysis.requiredLanguages ?? []).join(', ') || 'python'}
              </p>
            </div>
          )}
        </div>

        {/* 右侧：现有环境参考 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">本机已有环境</h3>
          <div className="space-y-3">
            {environments.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无扫描结果，请先返回首页刷新环境列表。</p>
            ) : (
              environments.slice(0, 8).map((env) => (
                <div key={env.id} className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium text-foreground">
                    {env.name} {env.version}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {env.isVirtual ? '虚拟环境' : '系统全局环境'} · {env.type}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
