/**
 * 全局类型声明
 * 扩展 Window 接口和全局类型
 */

interface IpcRenderer {
  send(channel: string, data: unknown): void;
  on(channel: string, listener: (event: Electron.IpcRendererEvent, data: unknown) => void): void;
  once(channel: string, listener: (event: Electron.IpcRendererEvent, data: unknown) => void): void;
  removeListener(
    channel: string,
    listener: (event: Electron.IpcRendererEvent, data: unknown) => void
  ): void;
  removeAllListeners(channel: string): void;
}

declare global {
  interface Window {
    ipcRenderer?: IpcRenderer;
  }
}

export {};
