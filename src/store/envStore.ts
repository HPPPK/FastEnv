/**
 * 环境状态管理存储
 * 使用 Zustand 管理全局环境相关状态
 */

import { create } from 'zustand';
import type { Environment, EnvironmentStatus } from '../types';

interface EnvStoreState {
  // 状态
  environments: Environment[];
  activeEnvironmentId: string | null;
  isLoading: boolean;
  error: string | null;
  lastScanTime: number | null;

  // 操作
  setEnvironments: (environments: Environment[]) => void;
  addEnvironment: (environment: Environment) => void;
  updateEnvironment: (id: string, updates: Partial<Environment>) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastScanTime: (time: number) => void;
  getEnvironmentById: (id: string) => Environment | undefined;
  getEnvironmentsByType: (type: string) => Environment[];
  getEnvironmentsByStatus: (status: EnvironmentStatus) => Environment[];
  clearAll: () => void;
}

export const useEnvStore = create<EnvStoreState>((set, get) => ({
  // 初始状态
  environments: [],
  activeEnvironmentId: null,
  isLoading: false,
  error: null,
  lastScanTime: null,

  // 设置环境列表
  setEnvironments: (environments: Environment[]) => {
    set({ environments });
  },

  // 添加环境
  addEnvironment: (environment: Environment) => {
    set((state) => ({
      environments: [...state.environments, environment],
    }));
  },

  // 更新环境
  updateEnvironment: (id: string, updates: Partial<Environment>) => {
    set((state) => ({
      environments: state.environments.map((env) =>
        env.id === id ? { ...env, ...updates, updatedAt: Date.now() } : env
      ),
    }));
  },

  // 删除环境
  deleteEnvironment: (id: string) => {
    set((state) => ({
      environments: state.environments.filter((env) => env.id !== id),
      activeEnvironmentId:
        state.activeEnvironmentId === id ? null : state.activeEnvironmentId,
    }));
  },

  // 设置活跃环境
  setActiveEnvironment: (id: string | null) => {
    set({ activeEnvironmentId: id });
  },

  // 设置加载状态
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  // 设置错误信息
  setError: (error: string | null) => {
    set({ error });
  },

  // 设置最后扫描时间
  setLastScanTime: (time: number) => {
    set({ lastScanTime: time });
  },

  // 根据ID获取环境
  getEnvironmentById: (id: string) => {
    return get().environments.find((env) => env.id === id);
  },

  // 根据类型获取环境
  getEnvironmentsByType: (type: string) => {
    return get().environments.filter((env) => env.type === type);
  },

  // 根据状态获取环境
  getEnvironmentsByStatus: (status: EnvironmentStatus) => {
    return get().environments.filter((env) => env.status === status);
  },

  // 清空所有状态
  clearAll: () => {
    set({
      environments: [],
      activeEnvironmentId: null,
      isLoading: false,
      error: null,
      lastScanTime: null,
    });
  },

  // 刷新环境列表
  refreshEnvironments: async () => {
    set({ isLoading: true });
    try {
      const { envguardApi } = await import('../api/envguard');
      const environments = await envguardApi.listEnvironments();
      set({
        environments,
        lastScanTime: Date.now(),
        error: null,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '刷新环境列表失败';
      set({ error: errorMsg });
    } finally {
      set({ isLoading: false });
    }
  },
}));
