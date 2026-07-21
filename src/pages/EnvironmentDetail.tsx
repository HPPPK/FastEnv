/**
 * 环境详情页面
 * 展示环境的完整配置、依赖清单、使用教程等
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useEnvStore } from '../store/envStore';

interface EnvironmentInfo {
  id: string;
  name: string;
  type: 'python' | 'node' | 'java' | 'go';
  version: string;
  path: string;
  status: 'healthy' | 'warning' | 'error';
  createdAt: string;
  dependencies: Array<{
    name: string;
    version: string;
  }>;
  lastRepair?: string;
  repairCount: number;
}

export default function EnvironmentDetail(): JSX.Element {
  const { setCurrentPage } = useUIStore();
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'dependencies' | 'tutorial' | 'history'>('config');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 store 获取当前选中的环境 ID
    const { activeEnvironmentId, environments } = useEnvStore.getState();
    
    if (!activeEnvironmentId) {
      setLoading(false);
      return;
    }

    // 从本地环境列表中查找环境
    const env = environments.find(e => e.id === activeEnvironmentId);
    if (env) {
      setEnvironment({
        id: env.id,
        name: env.name,
        type: env.type as 'python' | 'node' | 'java' | 'go',
        version: env.version,
        path: env.path,
        status: env.status as 'healthy' | 'warning' | 'error',
        createdAt: new Date(env.createdAt).toLocaleDateString('zh-CN'),
        dependencies: env.dependencies || [],
        lastRepair: env.updatedAt ? new Date(env.updatedAt).toLocaleDateString('zh-CN') : undefined,
        repairCount: 0,
      });
    }
    setLoading(false);
  }, []);

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

  const statusConfig = {
    healthy: { color: 'text-green-500', bg: 'bg-green-50', label: '正常' },
    warning: { color: 'text-yellow-500', bg: 'bg-yellow-50', label: '警告' },
    error: { color: 'text-red-500', bg: 'bg-red-50', label: '异常' },
  };

  const status = statusConfig[environment.status];

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
          <p className="mt-1 text-muted-foreground">
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
          <div className="text-right text-sm text-muted-foreground">
            <p>创建时间: {environment.createdAt}</p>
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
            </div>
          </div>
        )}

        {/* 依赖清单 */}
        {activeTab === 'dependencies' && (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">已安装依赖 ({environment.dependencies.length})</h3>
              <button className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <Download size={16} className="inline mr-2" />
                导出清单
              </button>
            </div>
            <div className="space-y-2">
              {environment.dependencies.map((dep, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <span className="font-mono text-foreground">{dep.name}</span>
                  <span className="text-sm text-muted-foreground">{dep.version}</span>
                </div>
              ))}
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
        <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">
          <RefreshCw size={18} />
          检测环境问题
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 font-medium text-foreground hover:bg-muted">
          <Download size={18} />
          导出配置
        </button>
      </div>
    </div>
  );
}
