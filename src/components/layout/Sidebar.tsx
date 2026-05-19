/**
 * 左侧导航栏组件
 * 显示功能菜单和导航选项
 */

import React from 'react';
import { PageType, useUIStore } from '../../store/uiStore';
import {
  Home,
  Plus,
  Package,
  AlertCircle,
  History,
  Settings,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  page: PageType;
}

const menuItems: MenuItem[] = [
  { id: 'home', label: '环境列表', icon: <Home size={20} />, page: 'home' },
  { id: 'new-env', label: '新建环境', icon: <Plus size={20} />, page: 'new-env' },
  { id: 'dependency', label: '安装依赖', icon: <Package size={20} />, page: 'dependency-install' },
  { id: 'conflict', label: '冲突修复', icon: <AlertCircle size={20} />, page: 'conflict-fix' },
  { id: 'records', label: '修复记录', icon: <History size={20} />, page: 'repair-records' },
  { id: 'settings', label: '全局设置', icon: <Settings size={20} />, page: 'settings' },
  { id: 'help', label: '帮助文档', icon: <HelpCircle size={20} />, page: 'help' },
];

export default function Sidebar(): JSX.Element {
  const { currentPage, setCurrentPage, sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <>
      {/* 移动设备菜单按钮 */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 rounded-lg bg-primary p-2 text-primary-foreground md:hidden"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 侧边栏背景遮罩（移动设备） */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo 区域 */}
        <div className="border-b border-border px-6 py-6">
          <h1 className="text-2xl font-bold text-primary">EnvGuard</h1>
          <p className="mt-1 text-sm text-muted-foreground">环境管理专家</p>
        </div>

        {/* 菜单项 */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.page);
                // 移动设备上点击后关闭侧边栏
                if (window.innerWidth < 768) {
                  toggleSidebar();
                }
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                currentPage === item.page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 底部信息 */}
        <div className="border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">
            EnvGuard v0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}
