/**
 * 主应用组件
 * 应用的根组件，包含路由和全局布局
 */

import React, { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { useEnvStore } from './store/envStore';
import { createDefaultSettings, useSettingsStore } from './store/settingsStore';
import { envguardApi } from './api/envguard';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import NewEnv from './pages/NewEnv';
import EnvDetail from './pages/EnvDetail';
import ConflictFix from './pages/ConflictFix';
import Settings from './pages/Settings';
import DependencyInstall from './pages/DependencyInstall';
import RepairRecords from './pages/RepairRecords';
import Help from './pages/Help';
import NotificationCenter from './components/common/NotificationCenter';

const pageComponents: Record<string, React.ComponentType> = {
  home: Home,
  'new-env': NewEnv,
  'env-detail': EnvDetail,
  'dependency-install': DependencyInstall,
  'conflict-fix': ConflictFix,
  'repair-records': RepairRecords,
  settings: Settings,
  help: Help,
};

export default function App(): JSX.Element {
  const { currentPage, setTheme } = useUIStore();
  const { setLoading: setEnvironmentLoading } = useEnvStore();
  const {
    setConfig,
    setLoading: setSettingsLoading,
    setError: setSettingsError,
  } = useSettingsStore();

  useEffect(() => {
    let cancelled = false;

    const initialize = async (): Promise<void> => {
      setSettingsLoading(true);
      setEnvironmentLoading(true);
      setSettingsError(null);

      try {
        const config = await envguardApi.getConfig();
        if (cancelled) return;
        setConfig(config);
        setTheme(config.theme);
      } catch (error) {
        if (cancelled) return;
        const fallback = createDefaultSettings();
        setConfig(fallback);
        setTheme(fallback.theme);
        setSettingsError(error instanceof Error ? error.message : '设置加载失败，已使用默认配置');
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
          setEnvironmentLoading(false);
        }
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [setConfig, setEnvironmentLoading, setSettingsError, setSettingsLoading, setTheme]);

  const CurrentPage = pageComponents[currentPage] || Home;

  return (
    <div className="h-screen w-screen bg-background text-foreground">
      <Layout>
        <CurrentPage />
      </Layout>
      <NotificationCenter />
    </div>
  );
}
