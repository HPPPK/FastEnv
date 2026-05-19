/**
 * Electron 窗口管理
 * 创建和管理应用主窗口
 */

import { BrowserWindow } from 'electron';
import path from 'path';
import { isDev } from '../utils/env';

/**
 * 创建主窗口
 */
export function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  // 加载应用
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    // 窗口已关闭，清理资源
  });

  return mainWindow;
}
