/**
 * 系统修复服务
 * 一键修复系统配置问题
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface SystemFixOptions {
  fixType: 'shell-config' | 'env-vars' | 'permissions' | 'all';
  backupPath?: string;
  onProgress?: (progress: SystemFixProgress) => void;
}

export interface SystemFixProgress {
  step: string;
  status: 'fixing' | 'success' | 'failed';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface SystemFixResult {
  success: boolean;
  fixedItems: string[];
  failedItems: string[];
  backupPath?: string;
  message: string;
  details?: Record<string, any>;
}

export class SystemFixer {
  private log(level: string, message: string): void {
    console.log(`[${level}] [SystemFixer] ${message}`);
  }

  private info(message: string): void {
    this.log('INFO', message);
  }

  private error(message: string): void {
    this.log('ERROR', message);
  }

  /**
   * 修复系统配置
   */
  async fixSystem(options: SystemFixOptions): Promise<SystemFixResult> {
    try {
      this.info(`开始修复系统配置: ${options.fixType}`);

      const backupPath = options.backupPath || this.createBackup();
      const fixedItems: string[] = [];
      const failedItems: string[] = [];

      let progress = 0;
      const totalSteps = options.fixType === 'all' ? 3 : 1;

      // 修复 Shell 配置
      if (options.fixType === 'shell-config' || options.fixType === 'all') {
        try {
          options.onProgress?.({
            step: 'shell-config',
            status: 'fixing',
            progress: Math.round((progress / totalSteps) * 100),
            message: '正在修复 Shell 配置...',
          });

          await this.fixShellConfig();
          fixedItems.push('shell-config');

          options.onProgress?.({
            step: 'shell-config',
            status: 'success',
            progress: Math.round(((progress + 1) / totalSteps) * 100),
            message: 'Shell 配置修复成功',
          });
        } catch (err) {
          failedItems.push('shell-config');
          options.onProgress?.({
            step: 'shell-config',
            status: 'failed',
            progress: Math.round(((progress + 1) / totalSteps) * 100),
            message: 'Shell 配置修复失败',
            error: String(err),
          });
        }
        progress++;
      }

      // 修复环境变量
      if (options.fixType === 'env-vars' || options.fixType === 'all') {
        try {
          options.onProgress?.({
            step: 'env-vars',
            status: 'fixing',
            progress: Math.round((progress / totalSteps) * 100),
            message: '正在修复环境变量...',
          });

          await this.fixEnvironmentVariables();
          fixedItems.push('env-vars');

          options.onProgress?.({
            step: 'env-vars',
            status: 'success',
            progress: Math.round(((progress + 1) / totalSteps) * 100),
            message: '环境变量修复成功',
          });
        } catch (err) {
          failedItems.push('env-vars');
          options.onProgress?.({
            step: 'env-vars',
            status: 'failed',
            progress: Math.round(((progress + 1) / totalSteps) * 100),
            message: '环境变量修复失败',
            error: String(err),
          });
        }
        progress++;
      }

      // 修复权限
      if (options.fixType === 'permissions' || options.fixType === 'all') {
        try {
          options.onProgress?.({
            step: 'permissions',
            status: 'fixing',
            progress: Math.round((progress / totalSteps) * 100),
            message: '正在修复权限...',
          });

          await this.fixPermissions();
          fixedItems.push('permissions');

          options.onProgress?.({
            step: 'permissions',
            status: 'success',
            progress: Math.round(((progress + 1) / totalSteps) * 100),
            message: '权限修复成功',
          });
        } catch (err) {
          failedItems.push('permissions');
          options.onProgress?.({
            step: 'permissions',
            status: 'failed',
            progress: Math.round(((progress + 1) / totalSteps) * 100),
            message: '权限修复失败',
            error: String(err),
          });
        }
        progress++;
      }

      const success = failedItems.length === 0;
      return {
        success,
        fixedItems,
        failedItems,
        backupPath,
        message: success ? '系统配置修复成功' : `${fixedItems.length} 个成功，${failedItems.length} 个失败`,
        details: {
          fixedItems,
          failedItems,
          backupPath,
        },
      };
    } catch (error) {
      this.error(`系统修复失败: ${error}`);
      return {
        success: false,
        fixedItems: [],
        failedItems: [],
        message: `系统修复失败: ${error}`,
      };
    }
  }

  /**
   * 修复 Shell 配置
   */
  private async fixShellConfig(): Promise<void> {
    this.info('修复 Shell 配置...');

    const homeDir = process.env.HOME || '';
    const shellConfigFiles = ['.bashrc', '.zshrc', '.bash_profile'];

    for (const file of shellConfigFiles) {
      const filePath = path.join(homeDir, file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');

        // 移除重复的 PATH 设置
        const lines = content.split('\n');
        const uniqueLines = Array.from(new Set(lines));
        content = uniqueLines.join('\n');

        // 添加标准的 PATH 初始化
        if (!content.includes('# EnvGuard PATH Configuration')) {
          content += '\n\n# EnvGuard PATH Configuration\n';
          content += 'export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"\n';
        }

        fs.writeFileSync(filePath, content);
        this.info(`已修复 ${file}`);
      }
    }
  }

  /**
   * 修复环境变量
   */
  private async fixEnvironmentVariables(): Promise<void> {
    this.info('修复环境变量...');

    // 重置关键环境变量
    const envVarsToReset = ['PYTHONPATH', 'JAVA_HOME', 'GOPATH', 'NODE_PATH'];
    for (const varName of envVarsToReset) {
      if (process.env[varName]) {
        delete process.env[varName];
        this.info(`已重置环境变量: ${varName}`);
      }
    }

    // 设置标准的环境变量
    const homeDir = process.env.HOME || '';
    process.env.PYTHONPATH = path.join(homeDir, '.envguard', 'python');
    process.env.GOPATH = path.join(homeDir, '.envguard', 'go');

    this.info('环境变量已重置');
  }

  /**
   * 修复权限
   */
  private async fixPermissions(): Promise<void> {
    this.info('修复权限...');

    const homeDir = process.env.HOME || '';
    const dirsToFix = [
      path.join(homeDir, '.envguard'),
      path.join(homeDir, '.pip'),
      path.join(homeDir, '.npm'),
    ];

    for (const dir of dirsToFix) {
      if (fs.existsSync(dir)) {
        try {
          // 设置目录权限为 755
          execSync(`chmod -R 755 "${dir}"`, { stdio: 'inherit' } as any);
          this.info(`已修复权限: ${dir}`);
        } catch (err) {
          this.error(`权限修复失败: ${dir} - ${err}`);
        }
      }
    }
  }

  /**
   * 创建备份
   */
  private createBackup(): string {
    const backupDir = path.join(process.env.HOME || '', '.envguard', 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `system-backup-${timestamp}`);

    fs.mkdirSync(backupPath, { recursive: true });

    // 备份 Shell 配置文件
    const homeDir = process.env.HOME || '';
    const filesToBackup = ['.bashrc', '.zshrc', '.bash_profile', '.profile'];

    for (const file of filesToBackup) {
      const filePath = path.join(homeDir, file);
      if (fs.existsSync(filePath)) {
        const backupFile = path.join(backupPath, file);
        fs.copyFileSync(filePath, backupFile);
      }
    }

    // 保存当前环境变量
    const envVars = {
      PATH: process.env.PATH,
      PYTHONPATH: process.env.PYTHONPATH,
      JAVA_HOME: process.env.JAVA_HOME,
      GOPATH: process.env.GOPATH,
      NODE_PATH: process.env.NODE_PATH,
    };
    fs.writeFileSync(path.join(backupPath, 'env-vars.json'), JSON.stringify(envVars, null, 2));

    this.info(`备份已创建: ${backupPath}`);
    return backupPath;
  }

  /**
   * 回滚修复
   */
  async rollback(backupPath: string): Promise<SystemFixResult> {
    try {
      this.info(`开始回滚系统修复: ${backupPath}`);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份路径不存在: ${backupPath}`);
      }

      const homeDir = process.env.HOME || '';

      // 恢复 Shell 配置文件
      const filesToRestore = ['.bashrc', '.zshrc', '.bash_profile', '.profile'];
      for (const file of filesToRestore) {
        const backupFile = path.join(backupPath, file);
        if (fs.existsSync(backupFile)) {
          const targetFile = path.join(homeDir, file);
          fs.copyFileSync(backupFile, targetFile);
          this.info(`已恢复 ${file}`);
        }
      }

      // 恢复环境变量
      const envVarsFile = path.join(backupPath, 'env-vars.json');
      if (fs.existsSync(envVarsFile)) {
        const envVars = JSON.parse(fs.readFileSync(envVarsFile, 'utf-8'));
        for (const [key, value] of Object.entries(envVars)) {
          if (value) {
            process.env[key] = value as string;
          }
        }
        this.info('环境变量已恢复');
      }

      this.info(`回滚完成`);
      return {
        success: true,
        fixedItems: [],
        failedItems: [],
        backupPath,
        message: '回滚成功',
      };
    } catch (error) {
      this.error(`回滚失败: ${error}`);
      return {
        success: false,
        fixedItems: [],
        failedItems: [],
        message: `回滚失败: ${error}`,
      };
    }
  }
}

export default SystemFixer;
