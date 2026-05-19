/**
 * IPC 客户端通信工具
 * 前端与主进程通信的统一接口
 */

import type { IPCRequest, IPCResponse, IPCEvent } from '../types/ipc';
import { TIMEOUTS } from '../../config/constants';

/**
 * IPC 请求超时错误
 */
class IPCTimeoutError extends Error {
  constructor(channel: string, timeout: number) {
    super(`IPC request timeout on channel "${channel}" after ${timeout}ms`);
    this.name = 'IPCTimeoutError';
  }
}

/**
 * IPC 通信错误
 */
class IPCError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'IPCError';
  }
}

/**
 * IPC 客户端类
 * 提供类型安全的 IPC 通信接口
 */
class IPCClient {
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason?: unknown) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor() {
    this.setupListeners();
  }

  /**
   * 设置 IPC 响应监听器
   */
  private setupListeners(): void {
    if (typeof window === 'undefined' || !window.ipcRenderer) {
      console.warn('IPC Renderer not available');
      return;
    }

    // 监听 IPC 响应
    window.ipcRenderer.on('ipc:response', (event: any, response: IPCResponse) => {
      const { id } = response;
      const pending = this.pendingRequests.get(id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(id);

        if (response.success) {
          pending.resolve(response.data);
        } else {
          const error = response.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error' };
          pending.reject(new IPCError(error.code, error.message, error.details));
        }
      }
    });

    // 监听 IPC 错误
    window.ipcRenderer.on('ipc:error', (event: any, error: any) => {
      console.error('IPC Error:', error);
    });
  }

  /**
   * 发送 IPC 请求
   */
  async invoke<T = unknown>(
    channel: string,
    data?: unknown,
    timeout?: number
  ): Promise<T> {
    const id = `${channel}-${++this.requestId}-${Date.now()}`;
    const timeoutMs = timeout || TIMEOUTS.IPC_REQUEST;

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new IPCTimeoutError(channel, timeoutMs));
      }, timeoutMs);

      // 保存待处理请求
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      // 发送请求
      if (window.ipcRenderer) {
        const request: IPCRequest = {
          id,
          channel,
          data,
          timestamp: Date.now(),
        };
        window.ipcRenderer.send('ipc:request', request);
      } else {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(id);
        reject(new Error('IPC Renderer not available'));
      }
    });
  }

  /**
   * 监听 IPC 事件
   */
  on<T = unknown>(channel: string, callback: (data: T) => void): () => void {
    if (!window.ipcRenderer) {
      console.warn('IPC Renderer not available');
      return () => {};
    }

    const listener = (event: any, eventData: IPCEvent<T>) => {
      if (eventData.channel === channel) {
        callback(eventData.data);
      }
    };

    window.ipcRenderer.on('ipc:event', listener);

    // 返回取消监听函数
    return () => {
      window.ipcRenderer?.removeListener('ipc:event', listener);
    };
  }

  /**
   * 监听 IPC 事件（仅一次）
   */
  once<T = unknown>(channel: string, callback: (data: T) => void): void {
    if (!window.ipcRenderer) {
      console.warn('IPC Renderer not available');
      return;
    }

    const listener = (event: any, eventData: IPCEvent<T>) => {
      if (eventData.channel === channel) {
        window.ipcRenderer?.removeListener('ipc:event', listener);
        callback(eventData.data);
      }
    };

    window.ipcRenderer.on('ipc:event', listener);
  }

  /**
   * 移除 IPC 事件监听
   */
  off(channel: string, callback?: (data: unknown) => void): void {
    if (!window.ipcRenderer) {
      return;
    }

    if (callback) {
      window.ipcRenderer.removeListener('ipc:event', callback as any);
    } else {
      window.ipcRenderer.removeAllListeners('ipc:event');
    }
  }

  /**
   * 清空所有待处理请求
   */
  clearPendingRequests(): void {
    this.pendingRequests.forEach(({ timeout }) => {
      clearTimeout(timeout);
    });
    this.pendingRequests.clear();
  }
}

// 导出单例
export const ipcClient = new IPCClient();

// 导出错误类
export { IPCError, IPCTimeoutError };
