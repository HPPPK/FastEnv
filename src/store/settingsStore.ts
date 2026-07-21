/**
 * 设置状态管理存储
 * 使用 Zustand 管理全局设置相关状态
 */

import { create } from 'zustand';
import type { AppSettings, MirrorSource } from '../types';

export const createDefaultSettings = (): AppSettings => ({
  theme: 'dark',
  language: 'zh-CN',
  autoBackup: true,
  logLevel: 'info',
  mirrorPython: 'https://mirrors.aliyun.com/pypi/simple/',
  mirrorNpm: 'https://registry.npmmirror.com',
});

interface SettingsStoreState {
  config: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  setConfig: (config: AppSettings) => void;
  updateConfig: (updates: Partial<AppSettings>) => void;
  updateMirrorSource: (source: Partial<MirrorSource>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetToDefault: () => AppSettings;
  getConfig: () => AppSettings | null;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  config: null,
  isLoading: false,
  error: null,

  setConfig: (config: AppSettings): void => {
    set({ config, error: null });
  },

  updateConfig: (updates: Partial<AppSettings>): void => {
    set((state) => ({
      config: state.config ? { ...state.config, ...updates, updatedAt: Date.now() } : null,
    }));
  },

  updateMirrorSource: (source: Partial<MirrorSource>): void => {
    set((state) => ({
      config: state.config
        ? {
            ...state.config,
            mirrorSource: {
              ...(state.config.mirrorSource ?? {}),
              ...source,
            } as MirrorSource,
            updatedAt: Date.now(),
          }
        : null,
    }));
  },

  setLoading: (loading: boolean): void => {
    set({ isLoading: loading });
  },

  setError: (error: string | null): void => {
    set({ error });
  },

  resetToDefault: (): AppSettings => {
    const config = createDefaultSettings();
    set({ config, error: null });
    return config;
  },

  getConfig: (): AppSettings | null => get().config,
}));
