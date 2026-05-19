/**
 * 主应用组件
 * 应用的根组件，包含路由和全局布局
 */

import React, { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { useEnvStore } from './store/envStore';
import { useSettingsStore } from './store/settingsStore';
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

/**
 * 页面映射
 */
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
  const { currentPage, theme, setTheme } = useUIStore();
  const { setLoading } = useEnvStore();
  const { resetToDefault } = useSettingsStore();

  // 初始化应用
  useEffect(() => {
    // 应用启动时初始化设置
    resetToDefault();

    // 应用主题
    setTheme(theme);

    // 模拟初始化完成
    setLoading(false);
  }, []);

  // 获取当前页面组件
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
