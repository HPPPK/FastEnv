/**
 * 数据持久化服务
 * 管理本地加密配置文件存储
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { Environment, RepairRecord, AppSettings } from '../../src/types';

export interface DeletedEnvironmentRecord {
  id: string;
  name: string;
  path: string;
  deletedAt: number;
}

/**
 * 数据持久化管理器
 */
export class PersistenceManager {
  private dataDir: string;
  private encryptionKey: string;

  constructor(dataDir?: string, keyPath?: string) {
    this.dataDir = dataDir ?? path.join(os.homedir(), '.envguard', 'data');
    this.encryptionKey = this.getOrCreateEncryptionKey(keyPath);
    this.ensureDataDir();
  }

  /**
   * 确保数据目录存在
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 获取或创建加密密钥
   */
  private getOrCreateEncryptionKey(customKeyPath?: string): string {
    const keyPath = customKeyPath ?? path.join(os.homedir(), '.envguard', '.key');
    const keyDir = path.dirname(keyPath);

    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }

    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, 'utf-8');
    }

    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyPath, key, { mode: 0o600 });
    return key;
  }

  /**
   * 加密数据
   */
  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密数据
   */
  private decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }

  /**
   * 保存环境列表
   */
  public saveEnvironments(environments: Environment[]): boolean {
    try {
      const filePath = path.join(this.dataDir, 'environments.json');
      const data = JSON.stringify(environments, null, 2);
      const encrypted = this.encrypt(data);
      fs.writeFileSync(filePath, encrypted);
      return true;
    } catch (error) {
      console.error('Failed to save environments:', error);
      return false;
    }
  }

  /**
   * 加载环境列表
   */
  public loadEnvironments(): Environment[] {
    try {
      const filePath = path.join(this.dataDir, 'environments.json');
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const encrypted = fs.readFileSync(filePath, 'utf-8');
      const data = this.decrypt(encrypted);
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load environments:', error);
      return [];
    }
  }

  public saveDeletedEnvironments(records: DeletedEnvironmentRecord[]): boolean {
    try {
      const filePath = path.join(this.dataDir, 'deleted-environments.json');
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save deleted environments:', error);
      return false;
    }
  }

  public loadDeletedEnvironments(): DeletedEnvironmentRecord[] {
    try {
      const filePath = path.join(this.dataDir, 'deleted-environments.json');
      if (!fs.existsSync(filePath)) {
        return [];
      }

      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error('Failed to load deleted environments:', error);
      return [];
    }
  }

  public markEnvironmentDeleted(environment: Pick<Environment, 'id' | 'name' | 'path'>): boolean {
    const records = this.loadDeletedEnvironments();
    const next: DeletedEnvironmentRecord = {
      id: environment.id,
      name: environment.name,
      path: environment.path,
      deletedAt: Date.now(),
    };
    const merged = [
      ...records.filter((record) => record.id !== next.id && record.path !== next.path),
      next,
    ];
    return this.saveDeletedEnvironments(merged);
  }

  public isEnvironmentDeleted(environment: Pick<Environment, 'id' | 'name' | 'path'>): boolean {
    return this.loadDeletedEnvironments().some(
      (record) =>
        record.id === environment.id ||
        record.path === environment.path ||
        record.name === environment.name
    );
  }

  /**
   * 保存修复记录
   */
  public saveRepairRecords(records: RepairRecord[]): boolean {
    try {
      const filePath = path.join(this.dataDir, 'repair-records.json');
      const data = JSON.stringify(records, null, 2);
      const encrypted = this.encrypt(data);
      fs.writeFileSync(filePath, encrypted);
      return true;
    } catch (error) {
      console.error('Failed to save repair records:', error);
      return false;
    }
  }

  /**
   * 加载修复记录
   */
  public loadRepairRecords(): RepairRecord[] {
    try {
      const filePath = path.join(this.dataDir, 'repair-records.json');
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const encrypted = fs.readFileSync(filePath, 'utf-8');
      const data = this.decrypt(encrypted);
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load repair records:', error);
      return [];
    }
  }

  /**
   * 保存应用设置
   */
  public saveSettings(settings: AppSettings): boolean {
    try {
      const filePath = path.join(this.dataDir, 'settings.json');
      const data = JSON.stringify(settings, null, 2);
      fs.writeFileSync(filePath, data);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * 加载应用设置
   */
  public loadSettings(): AppSettings {
    try {
      const filePath = path.join(this.dataDir, 'settings.json');
      if (!fs.existsSync(filePath)) {
        return this.getDefaultSettings();
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 获取默认设置
   */
  private getDefaultSettings(): AppSettings {
    return {
      mirrorPython: 'https://mirrors.aliyun.com/pypi/simple/',
      mirrorNpm: 'https://registry.npmmirror.com',
      autoBackup: true,
      logLevel: 'info',
      theme: 'dark',
      language: 'zh-CN',
    };
  }

  private isValidSettings(value: unknown): value is AppSettings {
    if (!value || typeof value !== 'object') return false;
    const settings = value as Partial<AppSettings>;
    return (settings.theme === 'light' || settings.theme === 'dark')
      && (settings.language === 'zh' || settings.language === 'zh-CN' || settings.language === 'en')
      && typeof settings.autoBackup === 'boolean'
      && (settings.logLevel === 'debug' || settings.logLevel === 'info' || settings.logLevel === 'warn' || settings.logLevel === 'error');
  }

  private isValidConfiguration(value: unknown): value is {
    environments: Environment[];
    records: RepairRecord[];
    settings: AppSettings;
  } {
    if (!value || typeof value !== 'object') return false;
    const config = value as { environments?: unknown; records?: unknown; settings?: unknown };
    return Array.isArray(config.environments)
      && config.environments.every((environment) => environment && typeof environment === 'object')
      && Array.isArray(config.records)
      && config.records.every((record) => record && typeof record === 'object')
      && this.isValidSettings(config.settings);
  }

  /**
   * 导出配置
   */
  public exportConfiguration(outputPath: string): boolean {
    try {
      const environments = this.loadEnvironments();
      const records = this.loadRepairRecords();
      const settings = this.loadSettings();

      const config = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        environments,
        records,
        settings,
      };

      fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to export configuration:', error);
      return false;
    }
  }

  /**
   * 导入配置
   */
  public importConfiguration(inputPath: string): boolean {
    const previous = {
      environments: this.loadEnvironments(),
      records: this.loadRepairRecords(),
      settings: this.loadSettings(),
    };
    try {
      const config: unknown = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
      if (!this.isValidConfiguration(config)) {
        throw new Error('Invalid EnvGuard configuration export');
      }
      const imported = config as { environments: Environment[]; records: RepairRecord[]; settings: AppSettings };
      if (!this.saveEnvironments(imported.environments)
        || !this.saveRepairRecords(imported.records)
        || !this.saveSettings(imported.settings)) {
        throw new Error('Failed to persist imported configuration');
      }
      return true;
    } catch (error) {
      this.saveEnvironments(previous.environments);
      this.saveRepairRecords(previous.records);
      this.saveSettings(previous.settings);
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * 清空所有数据
   */
  public clearAllData(): boolean {
    try {
      const files = fs.readdirSync(this.dataDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(this.dataDir, file));
      });
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }
}

// 导出单例
export const persistenceManager = new PersistenceManager();
