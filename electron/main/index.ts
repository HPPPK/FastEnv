/**
 * Electron 主进程入口
 * 负责应用生命周期、窗口管理、IPC 通信
 */

import { app, BrowserWindow } from 'electron';
import { isDev } from '../utils/env';
import { createWindow } from './window';
import { setupIPC } from '../ipc/setup';

let mainWindow: BrowserWindow | null = null;

/**
 * 应用启动事件
 */
app.on('ready', async () => {
  mainWindow = createWindow();
  setupIPC(mainWindow);

  // 开发环境下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
});

/**
 * 所有窗口关闭事件
 */
app.on('window-all-closed', () => {
  // macOS 上应用通常在用户明确退出前保持活跃
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 应用激活事件（macOS）
 */
app.on('activate', () => {
  // macOS 上点击 dock 图标时重新创建窗口
  if (mainWindow === null) {
    mainWindow = createWindow();
    setupIPC(mainWindow);
  }
});

/**
 * 处理任何未捕获的异常
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
