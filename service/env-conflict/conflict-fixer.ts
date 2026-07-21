/**
 * 环境冲突修复服务
 * 自动修复检测到的环境冲突问题
 */

import * as path from 'path';
import { logger } from '../logger/logger';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { ConflictIssue } from './conflict-detector';

export interface FixOptions {
  issues: ConflictIssue[];
  backupPath?: string;
  onProgress?: (progress: FixProgress) => void;
}

export interface FixProgress {
  issueId: string;
  status: 'fixing' | 'success' | 'failed' | 'skipped';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface FixResult {
  success: boolean;
  fixed: string[];
  failed: string[];
  backupPath?: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ConflictFixer {
  private info(message: string): void {
    logger.info('ConflictFixer', message);
  }

  private error(message: string): void {
    logger.error('ConflictFixer', message);
  }

  /**
   * 修复冲突
   */
  async fixConflicts(options: FixOptions): Promise<FixResult> {
    try {
      this.info(`开始修复 ${options.issues.length} 个冲突问题`);

      // 创建备份
      const backupPath = options.backupPath || this.createBackup();
      this.info(`已创建备份: ${backupPath}`);

      const fixed: string[] = [];
      const failed: string[] = [];

      for (let i = 0; i < options.issues.length; i++) {
        const issue = options.issues[i];
        const progress = Math.round(((i + 1) / options.issues.length) * 100);

        try {
          options.onProgress?.({
            issueId: issue.id,
            status: 'fixing',
            progress,
            message: `正在修复: ${issue.title}`,
          });

          await this.fixSingleIssue(issue);

          fixed.push(issue.id);
          options.onProgress?.({
            issueId: issue.id,
            status: 'success',
            progress,
            message: `修复成功: ${issue.title}`,
          });
        } catch (err) {
          failed.push(issue.id);
          options.onProgress?.({
            issueId: issue.id,
            status: 'failed',
            progress,
            message: `修复失败: ${issue.title}`,
            error: String(err),
          });
        }
      }

      const success = failed.length === 0;
      return {
        success,
        fixed,
        failed,
        backupPath,
        message: success ? '所有问题修复成功' : `${fixed.length} 个成功，${failed.length} 个失败`,
        details: {
          fixed,
          failed,
          backupPath,
        },
      };
    } catch (error) {
      this.error(`冲突修复失败: ${error}`);
      return {
        success: false,
        fixed: [],
        failed: options.issues.map((i) => i.id),
        message: `冲突修复失败: ${error}`,
      };
    }
  }

  /**
   * 修复单个问题
   */
  private async fixSingleIssue(issue: ConflictIssue): Promise<void> {
    switch (issue.type) {
      case 'path-conflict':
        await this.fixPathConflict(issue);
        break;
      case 'version-conflict':
        await this.fixVersionConflict(issue);
        break;
      case 'dependency-conflict':
        await this.fixDependencyConflict(issue);
        break;
      case 'permission-error':
        await this.fixPermissionError(issue);
        break;
      case 'mirror-error':
        await this.fixMirrorError(issue);
        break;
      case 'env-var-error':
        await this.fixEnvVarError(issue);
        break;
      default:
        throw new Error(`不支持的问题类型: ${issue.type}`);
    }
  }

  /**
   * 修复 PATH 冲突
   */
  private async fixPathConflict(issue: ConflictIssue): Promise<void> {
    this.info(`修复 PATH 冲突: ${issue.title}`);

    const pathVariable = process.env.PATH || '';
    const paths = pathVariable.split(path.delimiter);

    // 移除重复和无效的路径
    const uniquePaths = Array.from(new Set(paths)).filter((p) => p && fs.existsSync(p));

    // 更新 PATH
    const newPath = uniquePaths.join(path.delimiter);
    process.env.PATH = newPath;

    this.info(`PATH 已更新，移除了 ${paths.length - uniquePaths.length} 个无效或重复的路径`);
  }

  /**
   * 修复版本冲突
   */
  private async fixVersionConflict(issue: ConflictIssue): Promise<void> {
    this.info(`修复版本冲突: ${issue.title}`);

    // 调整 PATH 优先级，确保使用最新的稳定版本
    const pathVariable = process.env.PATH || '';
    const paths = pathVariable.split(path.delimiter);

    // 将 Python 3.11+ 的路径移到前面
    const reorderedPaths = paths.sort((a, b) => {
      if (a.includes('python3.11') || a.includes('python3.12')) return -1;
      if (b.includes('python3.11') || b.includes('python3.12')) return 1;
      return 0;
    });

    const newPath = reorderedPaths.join(path.delimiter);
    process.env.PATH = newPath;

    this.info(`版本优先级已调整`);
  }

  /**
   * 修复依赖冲突
   */
  private async fixDependencyConflict(issue: ConflictIssue): Promise<void> {
    this.info(`修复依赖冲突: ${issue.title}`);

    try {
      // 尝试升级 pip 和依赖
      const pipPath = this.getPythonPipPath();
      if (pipPath) {
        execSync(`"${pipPath}" install --upgrade pip`, { stdio: 'inherit' });
        execSync(`"${pipPath}" install --upgrade setuptools wheel`, { stdio: 'inherit' });
        this.info(`已升级 pip 和基础工具`);
      }
    } catch (err) {
      this.error(`升级失败: ${err}`);
      throw err;
    }
  }

  /**
   * 修复权限错误
   */
  private async fixPermissionError(issue: ConflictIssue): Promise<void> {
    this.info(`修复权限错误: ${issue.title}`);

    // 权限错误通常需要管理员权限，这里只能提示用户
    this.info(`需要管理员权限来修复此问题，请以管理员身份运行应用`);
  }

  /**
   * 修复镜像源错误
   */
  private async fixMirrorError(issue: ConflictIssue): Promise<void> {
    this.info(`修复镜像源错误: ${issue.title}`);

    try {
      // 切换到阿里云镜像源
      const pipPath = this.getPythonPipPath();
      if (pipPath) {
        const piprcPath = path.join(process.env.HOME || '', '.pip', 'pip.conf');
        const piprcContent = `[global]
index-url = https://mirrors.aliyun.com/pypi/simple/
[install]
trusted-host = mirrors.aliyun.com
`;
        fs.mkdirSync(path.dirname(piprcPath), { recursive: true });
        fs.writeFileSync(piprcPath, piprcContent);
        this.info(`已切换到阿里云镜像源`);
      }
    } catch (err) {
      this.error(`镜像源切换失败: ${err}`);
      throw err;
    }
  }

  /**
   * 修复环境变量错误
   */
  private async fixEnvVarError(issue: ConflictIssue): Promise<void> {
    this.info(`修复环境变量错误: ${issue.title}`);

    // 重置关键环境变量
    const criticalVars = ['PYTHONPATH', 'JAVA_HOME', 'GOPATH', 'NODE_PATH'];
    for (const varName of criticalVars) {
      if (process.env[varName]) {
        delete process.env[varName];
        this.info(`已清除环境变量: ${varName}`);
      }
    }
  }

  /**
   * 创建备份
   */
  private createBackup(): string {
    const backupDir = path.join(process.env.HOME || '', '.envguard', 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    fs.mkdirSync(backupPath, { recursive: true });

    // 备份关键文件
    const filesToBackup = [
      path.join(process.env.HOME || '', '.bashrc'),
      path.join(process.env.HOME || '', '.zshrc'),
      path.join(process.env.HOME || '', '.bash_profile'),
      path.join(process.env.HOME || '', '.pip', 'pip.conf'),
    ];

    for (const file of filesToBackup) {
      if (fs.existsSync(file)) {
        const backupFile = path.join(backupPath, path.basename(file));
        fs.copyFileSync(file, backupFile);
      }
    }

    // 保存当前 PATH
    fs.writeFileSync(path.join(backupPath, 'PATH.txt'), process.env.PATH || '');

    this.info(`备份已创建: ${backupPath}`);
    return backupPath;
  }

  /**
   * 回滚修复
   */
  async rollback(backupPath: string): Promise<FixResult> {
    try {
      this.info(`开始回滚修复: ${backupPath}`);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份路径不存在: ${backupPath}`);
      }

      // 恢复备份的文件
      const filesToRestore = fs.readdirSync(backupPath);
      for (const file of filesToRestore) {
        if (file === 'PATH.txt') {
          const pathContent = fs.readFileSync(path.join(backupPath, file), 'utf-8');
          process.env.PATH = pathContent;
        } else {
          const backupFile = path.join(backupPath, file);
          const targetFile = path.join(process.env.HOME || '', file);
          if (fs.existsSync(backupFile)) {
            fs.copyFileSync(backupFile, targetFile);
          }
        }
      }

      this.info(`回滚完成`);
      return {
        success: true,
        fixed: [],
        failed: [],
        backupPath,
        message: '回滚成功',
      };
    } catch (error) {
      this.error(`回滚失败: ${error}`);
      return {
        success: false,
        fixed: [],
        failed: [],
        message: `回滚失败: ${error}`,
      };
    }
  }

  /**
   * 获取 Python pip 路径
   */
  private getPythonPipPath(): string | null {
    try {
      const pipPath = execSync('which pip', { encoding: 'utf-8' }).trim();
      return pipPath || null;
    } catch {
      return null;
    }
  }
}

export default ConflictFixer;
