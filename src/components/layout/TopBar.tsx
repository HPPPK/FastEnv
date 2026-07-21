/**
 * 顶部栏组件
 * 显示搜索框、刷新、体检、设置按钮
 */

import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useEnvStore } from '../../store/envStore';
import { envguardApi } from '../../api/envguard';
import { mergeEnvironments } from '../../utils/env-merge';
import { Search, RefreshCw, Zap, Settings, Moon, Sun } from 'lucide-react';

export default function TopBar(): JSX.Element {
  const { searchQuery, setSearchQuery, theme, setTheme, setCurrentPage, addNotification } =
    useUIStore();
  const { setEnvironments, setLastScanTime, setError } = useEnvStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    setError(null);

    try {
      const stored = await envguardApi.listEnvironments();
      const scan = await envguardApi.scanSystem();
      const merged = mergeEnvironments(stored, scan.environments);
      setEnvironments(merged);
      setLastScanTime(scan.timestamp);
      addNotification({
        type: 'success',
        title: '体检完成',
        message: `已扫描 ${merged.length} 个环境，并统计已安装依赖`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '环境扫描失败';
      setError(message);
      addNotification({
        type: 'error',
        title: '体检失败',
        message,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleTheme = (): void => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* 搜索框 */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder="搜索环境..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2">
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-input bg-background p-2 text-foreground hover:bg-muted disabled:opacity-50"
            title="刷新环境列表"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin-slow' : ''} />
          </button>

          {/* 一键体检按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            title="一键体检系统环境"
          >
            <Zap size={18} />
            <span className="hidden sm:inline">一键体检</span>
          </button>

          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-input bg-background p-2 text-foreground hover:bg-muted"
            title={`切换到${theme === 'dark' ? '浅色' : '深色'}主题`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* 设置按钮 */}
          <button
            onClick={() => setCurrentPage('settings')}
            className="rounded-lg border border-input bg-background p-2 text-foreground hover:bg-muted"
            title="打开设置"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
