/**
 * 主布局组件
 * 三栏布局：左侧导航、中间主体、顶部栏
 */

import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="flex h-screen w-screen bg-background">
      {/* 左侧导航栏 */}
      <Sidebar />

      {/* 主体区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏 */}
        <TopBar />

        {/* 内容区域 */}
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
