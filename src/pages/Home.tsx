/**
 * 首页 - 环境列表管理
 * 显示所有开发环境卡片，支持缓存和手动刷新
 */

import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useEnvStore } from '../store/envStore';
import { useUIStore } from '../store/uiStore';
import { envguardApi } from '../api/envguard';
import EnvironmentCard from '../components/business/EnvironmentCard';
import EmptyState from '../components/common/EmptyState';
import { mergeEnvironments } from '../utils/env-merge';

export default function Home(): JSX.Element {
  const { environments, isLoading, error, setEnvironments, setLoading, setError, setLastScanTime } =
    useEnvStore();
  const { searchQuery, addNotification } = useUIStore();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const cacheExpiryRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadEnvironments = async (): Promise<void> => {
      // 检查缓存是否有效
      const now = Date.now();
      if (now < cacheExpiryRef.current) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const stored = await envguardApi.listEnvironments();
        const scan = await envguardApi.scanSystem();
        if (cancelled) return;

        const merged = mergeEnvironments(stored, scan.environments);
        setEnvironments(merged);
        setLastScanTime(scan.timestamp);
        setLastRefreshTime(Date.now());
        // 设置缓存过期时间为 5 分钟
        cacheExpiryRef.current = Date.now() + 5 * 60 * 1000;
      } catch (loadError) {
        if (cancelled) return;
        const message = loadError instanceof Error ? loadError.message : '环境列表加载失败';
        setError(message);
        addNotification({
          type: 'error',
          title: '环境扫描失败',
          message,
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEnvironments();

    return () => {
      cancelled = true;
    };
  }, [addNotification, setEnvironments, setError, setLastScanTime, setLoading]);

  // 手动刷新
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    setError(null);

    try {
      const stored = await envguardApi.listEnvironments();
      const scan = await envguardApi.scanSystem();

      const merged = mergeEnvironments(stored, scan.environments);
      setEnvironments(merged);
      setLastScanTime(scan.timestamp);
      setLastRefreshTime(Date.now());
      cacheExpiryRef.current = Date.now() + 5 * 60 * 1000;

      addNotification({
        type: 'success',
        title: '刷新成功',
        message: `已更新 ${merged.length} 个环境`,
      });
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : '刷新失败';
      setError(message);
      addNotification({
        type: 'error',
        title: '刷新失败',
        message,
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 过滤环境
  const filteredEnvironments = environments.filter(
    (env) =>
      env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      env.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && environments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin-slow">
            <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary" />
          </div>
          <p className="text-muted-foreground">正在加载环境列表...</p>
        </div>
      </div>
    );
  }

  if (filteredEnvironments.length === 0) {
    return (
      <EmptyState
        title={searchQuery ? '未找到匹配的环境' : '还没有创建任何环境'}
        description={
          error
            ? error
            : searchQuery
              ? '尝试修改搜索条件'
              : '点击左侧"新建环境"按钮创建第一个开发环境，或等待系统扫描完成'
        }
        icon="Package"
      />
    );
  }

  if (error && environments.length === 0) {
    return <EmptyState title="环境列表加载失败" description={error} icon="Package" />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">开发环境管理</h1>
          <p className="mt-2 text-muted-foreground">
            共 {filteredEnvironments.length} 个环境
            {lastRefreshTime && (
              <span className="ml-2 text-xs">
                (最后刷新: {new Date(lastRefreshTime).toLocaleTimeString('zh-CN')})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* 环境卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEnvironments.map((env) => (
          <EnvironmentCard key={env.id} environment={env} />
        ))}
      </div>
    </div>
  );
}
