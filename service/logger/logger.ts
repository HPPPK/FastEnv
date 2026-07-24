/**
 * 企业级日志系统
 * 分级日志记录、本地持久化、日志查询
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { LogEntry } from '../../src/types';

/**
 * 日志管理器
 */
export class Logger {
  private logDir: string;
  private currentLogFile: string;
  private logLevel: string = 'info';
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 10;

  constructor(logLevel: string = 'info', logDir?: string) {
    this.logDir = logDir ?? path.join(os.homedir(), '.envguard', 'logs');
    this.logLevel = logLevel;
    this.ensureLogDir();
    this.currentLogFile = this.getLogFilePath();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 获取日志文件路径
   */
  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `envguard-${date}.log`);
  }

  /**
   * 检查是否需要轮转日志
   */
  private checkLogRotation(): void {
    if (fs.existsSync(this.currentLogFile)) {
      const stats = fs.statSync(this.currentLogFile);
      if (stats.size > this.maxLogSize) {
        this.rotateLog();
      }
    }
  }

  /**
   * 轮转日志文件
   */
  private rotateLog(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      this.logDir,
      `envguard-${timestamp}.log`
    );
    fs.renameSync(this.currentLogFile, backupPath);

    // 清理过期日志
    this.cleanupOldLogs();
  }

  /**
   * 清理过期日志
   */
  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('envguard-') && f.endsWith('.log'))
        .sort()
        .reverse();

      if (files.length > this.maxLogFiles) {
        files.slice(this.maxLogFiles).forEach(file => {
          fs.unlinkSync(path.join(this.logDir, file));
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * 检查日志级别是否应该记录
   */
  private shouldLog(level: string): boolean {
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return (levels[level] ?? 1) >= (levels[this.logLevel] ?? 1);
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const module = `[${entry.module}]`.padEnd(20);
    const message = entry.message;
    const data = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    const stack = entry.stackTrace ? `\n${entry.stackTrace}` : '';

    return `${timestamp} ${level} ${module} ${message}${data}${stack}`;
  }

  /**
   * 写入日志
   */
  private writeLog(entry: LogEntry): void {
    try {
      this.checkLogRotation();
      const formatted = this.formatLogEntry(entry);
      fs.appendFileSync(this.currentLogFile, formatted + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * 记录 DEBUG 级别日志
   */
  public debug(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      level: 'debug',
      timestamp: Date.now(),
      module,
      message,
      data,
    };

    this.writeLog(entry);
    console.debug(`[${module}] ${message}`, data);
  }

  /**
   * 记录 INFO 级别日志
   */
  public info(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      level: 'info',
      timestamp: Date.now(),
      module,
      message,
      data,
    };

    this.writeLog(entry);
    console.info(`[${module}] ${message}`, data);
  }

  /**
   * 记录 WARN 级别日志
   */
  public warn(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      level: 'warn',
      timestamp: Date.now(),
      module,
      message,
      data,
    };

    this.writeLog(entry);
    console.warn(`[${module}] ${message}`, data);
  }

  /**
   * 记录 ERROR 级别日志
   */
  public error(module: string, message: string, error?: Error | unknown): void {
    if (!this.shouldLog('error')) return;

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      level: 'error',
      timestamp: Date.now(),
      module,
      message,
      data: error instanceof Error ? error.message : error,
      stackTrace: error instanceof Error ? error.stack : undefined,
    };

    this.writeLog(entry);
    console.error(`[${module}] ${message}`, error);
  }

  /**
   * 设置日志级别
   */
  public setLogLevel(level: string): void {
    this.logLevel = level;
  }

  /**
   * 获取日志文件内容
   */
  /** Return structured entries parsed from current and rotated log files. */
  public getLogEntries(lines: number = 200): LogEntry[] {
    const safeLines = Math.max(1, Math.min(Math.floor(lines), 1000));
    try {
      const files = fs.readdirSync(this.logDir)
        .filter((file) => file.startsWith('envguard-') && file.endsWith('.log'))
        .sort();
      const entries: LogEntry[] = [];
      const linePattern = /^(\S+)\s+(DEBUG|INFO|WARN|ERROR)\s+\[([^\]]+)\]\s+(.*)$/;
      for (const file of files) {
        const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
        for (const line of content.split(/\r?\n/)) {
          if (!line.trim()) continue;
          const match = line.match(linePattern);
          if (!match) continue;
          const [, timestampText, levelText, module, payload] = match;
          const separator = payload.lastIndexOf(' | ');
          const message = separator >= 0 ? payload.slice(0, separator) : payload;
          const dataText = separator >= 0 ? payload.slice(separator + 3) : undefined;
          let data: unknown;
          if (dataText) {
            try { data = JSON.parse(dataText); } catch { data = dataText; }
          }
          const timestamp = Date.parse(timestampText);
          entries.push({
            id: 'log-' + timestamp + '-' + entries.length,
            timestamp,
            level: levelText.toLowerCase() as LogEntry['level'],
            module,
            message,
            ...(data !== undefined ? { data } : {}),
          });
        }
      }
      return entries.slice(-safeLines).reverse();
    } catch (error) {
      console.error('Failed to read structured logs:', error);
      return [];
    }
  }

  public getLogContent(lines: number = 100): string {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return '';
      }

      const content = fs.readFileSync(this.currentLogFile, 'utf-8');
      const logLines = content.split('\n');
      return logLines.slice(-lines).join('\n');
    } catch (error) {
      console.error('Failed to read log file:', error);
      return '';
    }
  }

  /**
   * 清空日志
   */
  public clearLogs(): boolean {
    try {
      const files = fs.readdirSync(this.logDir).filter((file) => file.startsWith('envguard-') && file.endsWith('.log'));
      files.forEach((file) => {
        fs.unlinkSync(path.join(this.logDir, file));
      });
      return true;
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return false;
    }
  }

  /**
   * 导出日志
   */
  public exportLogs(outputPath: string): boolean {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('envguard-') && f.endsWith('.log'))
        .sort();

      let allLogs = '';
      files.forEach(file => {
        const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
        allLogs += content + '\n';
      });

      fs.writeFileSync(outputPath, allLogs);
      return true;
    } catch (error) {
      console.error('Failed to export logs:', error);
      return false;
    }
  }
}

// 导出全局日志实例
export const logger = new Logger('info');
