/**
 * 环境冲突检测服务
 * 检测系统中的环境冲突问题
 */

import * as path from 'path';
import { logger } from '../logger/logger';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface ConflictIssue {
  id: string;
  type:
    | 'path-conflict'
    | 'version-conflict'
    | 'dependency-conflict'
    | 'permission-error'
    | 'mirror-error'
    | 'env-var-error';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedItems: string[];
  suggestedFix: string;
}

export interface ConflictDetectionResult {
  success: boolean;
  issues: ConflictIssue[];
  systemInfo: {
    platform: string;
    pathVariable: string;
    pythonVersions: string[];
    nodeVersions: string[];
  };
  message: string;
}

export class ConflictDetector {
  private info(message: string): void {
    logger.info('ConflictDetector', message);
  }

  private error(message: string): void {
    logger.error('ConflictDetector', message);
  }

  /**
   * 检测环境冲突
   */
  async detectConflicts(): Promise<ConflictDetectionResult> {
    try {
      this.info('开始检测环境冲突...');

      const issues: ConflictIssue[] = [];
      const systemInfo = this.getSystemInfo();

      // 检测 PATH 冲突
      const pathIssues = this.detectPathConflicts(systemInfo.pathVariable);
      issues.push(...pathIssues);

      // 检测版本冲突
      const versionIssues = this.detectVersionConflicts();
      issues.push(...versionIssues);

      // 检测依赖冲突
      const depIssues = this.detectDependencyConflicts();
      issues.push(...depIssues);

      // 检测权限问题
      const permIssues = this.detectPermissionIssues();
      issues.push(...permIssues);

      // 检测镜像源问题
      const mirrorIssues = this.detectMirrorIssues();
      issues.push(...mirrorIssues);

      this.info(`检测完成，发现 ${issues.length} 个问题`);

      return {
        success: true,
        issues,
        systemInfo,
        message: `检测完成，发现 ${issues.length} 个问题`,
      };
    } catch (error) {
      this.error(`冲突检测失败: ${error}`);
      return {
        success: false,
        issues: [],
        systemInfo: this.getSystemInfo(),
        message: `冲突检测失败: ${error}`,
      };
    }
  }

  /**
   * 获取系统信息
   */
  private getSystemInfo(): {
    platform: string;
    pathVariable: string;
    pythonVersions: string[];
    nodeVersions: string[];
  } {
    const pathVariable = process.env.PATH || '';
    const pythonVersions = this.detectInstalledVersions('python');
    const nodeVersions = this.detectInstalledVersions('node');

    return {
      platform: process.platform,
      pathVariable,
      pythonVersions,
      nodeVersions,
    };
  }

  /**
   * 检测已安装的版本
   */
  private detectInstalledVersions(tool: string): string[] {
    const versions: string[] = [];
    try {
      // 检测 Python 版本
      if (tool === 'python') {
        for (let i = 2; i <= 12; i++) {
          try {
            const version = execSync(`python${i}.${i % 2} --version`, { encoding: 'utf-8' }).trim();
            versions.push(version);
          } catch {
            // 版本不存在
          }
        }
      }
      // 检测 Node 版本
      if (tool === 'node') {
        try {
          const version = execSync('node --version', { encoding: 'utf-8' }).trim();
          versions.push(version);
        } catch {
          // Node 不存在
        }
      }
    } catch {
      // 忽略错误
    }
    return versions;
  }

  /**
   * 检测 PATH 冲突
   */
  private detectPathConflicts(pathVariable: string): ConflictIssue[] {
    const issues: ConflictIssue[] = [];
    const paths = pathVariable.split(path.delimiter);
    const pathSet = new Set<string>();
    const duplicates: string[] = [];

    for (const p of paths) {
      if (pathSet.has(p)) {
        duplicates.push(p);
      }
      pathSet.add(p);
    }

    // 检测重复的 PATH
    if (duplicates.length > 0) {
      issues.push({
        id: `path-dup-${Date.now()}`,
        type: 'path-conflict',
        severity: 'warning',
        title: 'PATH 中存在重复路径',
        description: `系统 PATH 中存在 ${duplicates.length} 个重复的路径条目，这可能导致性能下降`,
        affectedItems: duplicates,
        suggestedFix: '移除重复的 PATH 条目',
      });
    }

    // 检测无效的 PATH
    const invalidPaths = paths.filter((p) => p && !fs.existsSync(p));
    if (invalidPaths.length > 0) {
      issues.push({
        id: `path-invalid-${Date.now()}`,
        type: 'path-conflict',
        severity: 'info',
        title: 'PATH 中存在无效路径',
        description: `系统 PATH 中存在 ${invalidPaths.length} 个不存在的路径`,
        affectedItems: invalidPaths,
        suggestedFix: '移除无效的 PATH 条目',
      });
    }

    return issues;
  }

  /**
   * 检测版本冲突
   */
  private detectVersionConflicts(): ConflictIssue[] {
    const issues: ConflictIssue[] = [];

    try {
      // 检测多个 Python 版本
      const pythonVersions = this.detectInstalledVersions('python');
      if (pythonVersions.length > 1) {
        issues.push({
          id: `version-python-${Date.now()}`,
          type: 'version-conflict',
          severity: 'warning',
          title: '系统中存在多个 Python 版本',
          description: `检测到 ${pythonVersions.length} 个 Python 版本，可能导致版本冲突`,
          affectedItems: pythonVersions,
          suggestedFix: '调整 PATH 优先级，确保使用正确的 Python 版本',
        });
      }
    } catch {
      // 忽略错误
    }

    return issues;
  }

  /**
   * 检测依赖冲突
   */
  private detectDependencyConflicts(): ConflictIssue[] {
    const issues: ConflictIssue[] = [];

    try {
      // 检测 Python 依赖冲突
      const pipPath = this.getPythonPipPath();
      if (pipPath) {
        try {
          const output = execSync(`"${pipPath}" check`, { encoding: 'utf-8' });
          if (output.includes('conflict')) {
            issues.push({
              id: `dep-python-${Date.now()}`,
              type: 'dependency-conflict',
              severity: 'critical',
              title: 'Python 依赖冲突',
              description: '检测到 Python 依赖版本不兼容',
              affectedItems: [output],
              suggestedFix: '运行 pip install --upgrade 升级依赖到兼容版本',
            });
          }
        } catch {
          // pip check 失败
        }
      }
    } catch {
      // 忽略错误
    }

    return issues;
  }

  /**
   * 检测权限问题
   */
  private detectPermissionIssues(): ConflictIssue[] {
    const issues: ConflictIssue[] = [];

    try {
      // 检测是否有权限写入系统目录
      const testDirs = ['/usr/local/bin', '/opt/homebrew/bin'];
      const noPermissionDirs: string[] = [];

      for (const dir of testDirs) {
        if (fs.existsSync(dir)) {
          try {
            fs.accessSync(dir, fs.constants.W_OK);
          } catch {
            noPermissionDirs.push(dir);
          }
        }
      }

      if (noPermissionDirs.length > 0) {
        issues.push({
          id: `perm-${Date.now()}`,
          type: 'permission-error',
          severity: 'warning',
          title: '权限不足',
          description: `无法写入以下系统目录: ${noPermissionDirs.join(', ')}`,
          affectedItems: noPermissionDirs,
          suggestedFix: '使用 sudo 或以管理员身份运行应用',
        });
      }
    } catch {
      // 忽略错误
    }

    return issues;
  }

  /**
   * 检测镜像源问题
   */
  private detectMirrorIssues(): ConflictIssue[] {
    const issues: ConflictIssue[] = [];

    try {
      // 检测 pip 镜像源
      const pipPath = this.getPythonPipPath();
      if (pipPath) {
        try {
          execSync(`"${pipPath}" index versions pip`, { encoding: 'utf-8', timeout: 5000 });
        } catch {
          issues.push({
            id: `mirror-pip-${Date.now()}`,
            type: 'mirror-error',
            severity: 'warning',
            title: 'pip 镜像源不可用',
            description: '无法连接到当前 pip 镜像源，可能导致依赖安装失败',
            affectedItems: ['pip'],
            suggestedFix: '切换到其他镜像源，如阿里云、清华大学等国内镜像',
          });
        }
      }
    } catch {
      // 忽略错误
    }

    return issues;
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

export default ConflictDetector;
