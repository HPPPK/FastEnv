/**
 * 环境卡片组件
 * 显示单个开发环境的信息和快捷操作
 */

import React, { useState } from 'react';
import type { Environment } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { useEnvStore } from '../../store/envStore';
import { envguardApi } from '../../api/envguard';
import {
  MoreVertical,
  Play,
  Settings,
  Package,
  AlertCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface EnvironmentCardProps {
  environment: Environment;
}

export default function EnvironmentCard({ environment }: EnvironmentCardProps): JSX.Element {
  const { setCurrentPage, setSelectedEnvironment, addNotification } = useUIStore();
  const { deleteEnvironment, setActiveEnvironment } = useEnvStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setDeleting] = useState(false);

  const getStatusIcon = () => {
    switch (environment.status) {
      case 'healthy':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (environment.status) {
      case 'healthy':
        return '正常';
      case 'warning':
        return '警告';
      case 'error':
        return '异常';
      default:
        return '未知';
    }
  };

  const getTypeLabel = () => {
    const typeMap: Record<string, string> = {
      python: 'Python',
      node: 'Node.js',
      java: 'Java',
      go: 'Go',
      rust: 'Rust',
      dotnet: '.NET',
    };
    return typeMap[environment.type] || environment.type;
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除环境 "${environment.name}" 吗？这会从 EnvGuard 缓存中移除该环境；受管虚拟环境也会删除本地环境目录。`)) {
      return;
    }

    setDeleting(true);
    try {
      await envguardApi.deleteEnvironment(environment, true);
      deleteEnvironment(environment.id);
      setSelectedEnvironment(null);
      setActiveEnvironment(null);
      addNotification({
        type: 'success',
        title: '环境已删除',
        message: `${environment.name} 已从本地记录和缓存中移除。`,
      });
      setShowMenu(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: '删除失败',
        message: error instanceof Error ? error.message : '无法删除该环境',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      {/* 卡片头部 */}
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground" title={environment.name}>
            {environment.name}
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <span className="min-w-0 truncate rounded bg-primary/10 px-2 py-1 text-center text-xs font-medium text-primary">
              {getTypeLabel()}
            </span>
            {environment.tags.map((tag) => (
              <span
                key={tag}
                title={tag}
                className="min-w-0 truncate rounded bg-muted px-2 py-1 text-center text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 菜单按钮 */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <MoreVertical size={18} />
          </button>

          {/* 下拉菜单 */}
          {showMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg">
              <button
                onClick={() => {
                  setSelectedEnvironment(environment);
                  setActiveEnvironment(environment.id);
                  setCurrentPage('env-detail');
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Settings size={16} />
                环境详情
              </button>
              <button
                onClick={() => {
                  setSelectedEnvironment(environment);
                  setActiveEnvironment(environment.id);
                  setCurrentPage('dependency-install');
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Package size={16} />
                安装依赖
              </button>
              <button
                onClick={() => {
                  setCurrentPage('conflict-fix');
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                <AlertCircle size={16} />
                检测冲突
              </button>
              <hr className="my-1 border-border" />
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 size={16} />
                {isDeleting ? '删除中...' : '删除环境'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 卡片信息 */}
      <div className="mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">版本号</span>
          <span className="font-mono font-medium text-foreground">{environment.version}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">状态</span>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <span className="font-medium text-foreground">{getStatusText()}</span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">依赖数</span>
          <span className="font-medium text-foreground">{environment.dependencies.length}</span>
        </div>
      </div>

      {/* 快捷操作按钮 */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Play size={16} />
          激活
        </button>
        <button
          onClick={() => {
            setSelectedEnvironment(environment);
            setActiveEnvironment(environment.id);
            setCurrentPage('env-detail');
          }}
          className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          详情
        </button>
      </div>

      {/* 创建时间 */}
      <div className="mt-3 text-xs text-muted-foreground">
        创建于 {new Date(environment.createdAt).toLocaleDateString('zh-CN')}
      </div>
    </div>
  );
}
