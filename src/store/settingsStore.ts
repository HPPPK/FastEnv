/**
 * 设置状态管理存储
 * 使用 Zustand 管理全局设置相关状态
 */

import { create } from 'zustand';
import { LogLevel } from '../types';
import type { UserConfig, MirrorSource } from '../types';

interface SettingsStoreState {
  // 用户配置
  config: UserConfig | null;
  isLoading: boolean;
  error: string | null;

  // 操作
  setConfig: (config: UserConfig) => void;
  updateConfig: (updates: Partial<UserConfig>) => void;
  updateMirrorSource: (source: Partial<MirrorSource>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetToDefault: () => void;
  getConfig: () => UserConfig | null;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  // 初始状态
  config: null,
  isLoading: false,
  error: null,

  // 设置配置
  setConfig: (config: UserConfig) => {
    set({ config });
  },

  // 更新配置
  updateConfig: (updates: Partial<UserConfig>) => {
    set((state) => ({
      config: state.config ? { ...state.config, ...updates } : null,
    }));
  },

  // 更新镜像源
  updateMirrorSource: (source: Partial<MirrorSource>) => {
    set((state) => ({
      config: state.config
        ? {
            ...state.config,
            mirrorSource: {
              ...state.config.mirrorSource,
              ...source,
            },
          }
        : null,
    }));
  },

  // 设置加载状态
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  // 设置错误信息
  setError: (error: string | null) => {
    set({ error });
  },

  // 重置为默认配置
  resetToDefault: () => {
    set({
      config: {
        theme: 'dark',
        language: 'zh-CN',
        autoBackup: true,
        autoRepairBeforeBackup: true,
        logLevel: LogLevel.INFO,
        defaultVirtualEnvPath: '',
        enableScanPermission: true,
        mirrorSource: {
          python: 'https://mirrors.aliyun.com/pypi/simple/',
          npm: 'https://registry.npmmirror.com',
          maven: 'https://maven.aliyun.com/repository/public',
          cargo: 'https://github.com/rust-lang/crates.io-index',
          custom: {},
        },
      },
    });
  },

  // 获取配置
  getConfig: () => {
    return get().config;
  },
}));
