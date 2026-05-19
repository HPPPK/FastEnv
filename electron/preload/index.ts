/**
 * Electron 预加载脚本
 * 在渲染进程加载前执行，提供安全的 IPC 通信接口
 * 遵循 Electron 安全最佳实践：contextIsolation + preload
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * 暴露安全的 IPC 接口给渲染进程
 * 仅暴露必要的方法，防止恶意代码访问系统
 */
contextBridge.exposeInMainWorld('ipcRenderer', {
  /**
   * 发送 IPC 消息到主进程
   */
  send: (channel: string, data: unknown) => {
    // 白名单验证
    const validChannels = [
      'ipc:request',
      'system:scan',
      'env:list',
      'env:create',
      'env:delete',
      'env:rename',
      'env:activate',
      'env:detail',
      'env:health-check',
      'dependency:install',
      'dependency:uninstall',
      'dependency:list',
      'conflict:detect',
      'conflict:fix',
      'repair-records:list',
      'conflict:rollback',
      'demand:parse',
      'config:get',
      'config:set',
      'config:export',
      'config:import',
      'log:get',
      'log:clear',
      'file:open',
      'file:save',
      'file:pick',
      'system:info',
      'system:open-path',
      'system:open-url',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`[IPC] Blocked send to invalid channel: ${channel}`);
    }
  },

  /**
   * 监听来自主进程的消息
   */
  on: (channel: string, listener: (event: any, data: unknown) => void) => {
    const validChannels = [
      'ipc:response',
      'ipc:event',
      'ipc:error',
      'system:scan:progress',
      'dependency:install:progress',
      'conflict:detect:progress',
      'conflict:fix:progress',
      'demand:parse:progress',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener);
    } else {
      console.warn(`[IPC] Blocked listener on invalid channel: ${channel}`);
    }
  },

  /**
   * 监听来自主进程的消息（仅一次）
   */
  once: (channel: string, listener: (event: any, data: unknown) => void) => {
    const validChannels = [
      'ipc:response',
      'ipc:event',
      'ipc:error',
      'system:scan:progress',
      'dependency:install:progress',
      'conflict:detect:progress',
      'conflict:fix:progress',
      'demand:parse:progress',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, listener);
    } else {
      console.warn(`[IPC] Blocked once listener on invalid channel: ${channel}`);
    }
  },

  /**
   * 移除事件监听
   */
  removeListener: (channel: string, listener: (event: any, data: unknown) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },

  /**
   * 移除所有事件监听
   */
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

console.log('[Preload] IPC bridge initialized');
