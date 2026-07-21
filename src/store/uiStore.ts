/**
 * UI 状态管理存储
 * 使用 Zustand 管理全局 UI 相关状态
 */

import { create } from 'zustand';
import { Environment } from '../types/index';

export type PageType =
  | 'home'
  | 'new-env'
  | 'env-detail'
  | 'dependency-install'
  | 'conflict-fix'
  | 'repair-records'
  | 'settings'
  | 'help';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UIStoreState {
  // 页面导航
  currentPage: PageType;
  previousPage: PageType | null;
  setCurrentPage: (page: PageType) => void;

  // 选中的环境
  selectedEnvironment: Environment | null;
  setSelectedEnvironment: (env: Environment | null) => void;

  // 侧边栏
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // 主题
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;

  // 通知
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // 模态框
  modals: Record<string, boolean>;
  openModal: (name: string) => void;
  closeModal: (name: string) => void;
  toggleModal: (name: string) => void;

  // 搜索
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // 加载状态
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // 刷新标志
  shouldRefresh: boolean;
  setShouldRefresh: (refresh: boolean) => void;
}

export const useUIStore = create<UIStoreState>((set, get) => ({
  // 页面导航
  currentPage: 'home',
  previousPage: null,
  setCurrentPage: (page: PageType): void => {
    set((state) => ({
      previousPage: state.currentPage,
      currentPage: page,
    }));
  },

  // 选中的环境
  selectedEnvironment: null,
  setSelectedEnvironment: (env: Environment | null): void => {
    set({ selectedEnvironment: env });
  },

  // 侧边栏
  sidebarOpen: true,
  setSidebarOpen: (open: boolean): void => {
    set({ sidebarOpen: open });
  },
  toggleSidebar: (): void => {
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    }));
  },

  // 主题
  theme: 'dark',
  setTheme: (theme: 'light' | 'dark' | 'auto'): void => {
    set({ theme });
    // 应用主题到 DOM
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // auto 模式
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  // 通知
  notifications: [],
  addNotification: (notification: Omit<Notification, 'id'>): void => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 3000,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // 自动移除通知
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }
  },
  removeNotification: (id: string): void => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
  clearNotifications: (): void => {
    set({ notifications: [] });
  },

  // 模态框
  modals: {},
  openModal: (name: string): void => {
    set((state) => ({
      modals: { ...state.modals, [name]: true },
    }));
  },
  closeModal: (name: string): void => {
    set((state) => ({
      modals: { ...state.modals, [name]: false },
    }));
  },
  toggleModal: (name: string): void => {
    set((state) => ({
      modals: { ...state.modals, [name]: !state.modals[name] },
    }));
  },

  // 搜索
  searchQuery: '',
  setSearchQuery: (query: string): void => {
    set({ searchQuery: query });
  },

  // 加载状态
  isGlobalLoading: false,
  setGlobalLoading: (loading: boolean): void => {
    set({ isGlobalLoading: loading });
  },

  // 刷新标志
  shouldRefresh: false,
  setShouldRefresh: (refresh: boolean): void => {
    set({ shouldRefresh: refresh });
  },
}));
