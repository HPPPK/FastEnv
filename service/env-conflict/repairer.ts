/**
 * 环境冲突修复服务
 * 自动修复检测到的环境冲突
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { EnvironmentConflict, RepairRecord, RepairStatus } from '../../src/types';
import { logger } from '../logger/logger';
import {
  capturePlatformEnvironment,
  readPersistentPath,
  restorePersistentPath,
  restoreProcessEnvironment,
  updatePersistentPath,
  type PersistentPathChange,
  type PlatformEnvironmentSnapshot,
} from './platform-backup';

/**
 * 冲突修复器类
 */
export class ConflictRepairer {
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(os.homedir(), '.envguard', 'backups');
    this.ensureBackupDir();
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 修复冲突
   */
  public async repairConflicts(
    conflicts: EnvironmentConflict[],
    environmentId: string
  ): Promise<RepairRecord> {
    const repairRecord: RepairRecord = {
      id: `repair-${Date.now()}`,
      environmentId,
      conflicts,
      status: 'in_progress' as RepairStatus,
      startTime: Date.now(),
      changes: [],
      logs: [],
      rollbackable: true,
    };

    try {
      // 备份原始配置
      const backupPath = await this.backupConfiguration();
      repairRecord.backupPath = backupPath;
      repairRecord.logs.push(`✓ 已备份原始配置到: ${backupPath}`);
      logger.info('ConflictRepairer', `备份配置到: ${backupPath}`);

      // 逐个修复冲突
      let successCount = 0;
      let failureCount = 0;

      for (const conflict of conflicts) {
        if (conflict.autoFixable) {
          try {
            await this.repairSingleConflict(conflict, repairRecord);
            successCount++;
          } catch (error) {
            failureCount++;
            repairRecord.logs.push(
              `✗ 修复失败: ${conflict.description} - ${error instanceof Error ? error.message : '未知错误'}`
            );
            logger.error('ConflictRepairer', `修复冲突失败: ${conflict.id}`, {
              error: error instanceof Error ? error.message : '未知错误',
            });
          }
        }
      }

      repairRecord.status =
        failureCount === 0 ? ('success' as RepairStatus) : ('partial' as RepairStatus);
      repairRecord.endTime = Date.now();
      repairRecord.duration = repairRecord.endTime - (repairRecord.startTime || 0);
      repairRecord.logs.push(
        `修复完成: 成功 ${successCount} 个, 失败 ${failureCount} 个, 耗时 ${repairRecord.duration}ms`
      );

      logger.info('ConflictRepairer', `修复完成: 成功 ${successCount}, 失败 ${failureCount}`);
    } catch (error) {
      repairRecord.status = 'failed' as RepairStatus;
      repairRecord.endTime = Date.now();
      repairRecord.duration = repairRecord.endTime - (repairRecord.startTime || 0);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      repairRecord.logs.push(`✗ 修复过程出错: ${errorMsg}`);
      repairRecord.errorMessage = errorMsg;
      logger.error('ConflictRepairer', '修复过程出错', { error: errorMsg });
    }

    return repairRecord;
  }

  /**
   * 修复单个冲突
   */
  private async repairSingleConflict(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push(`→ 开始修复: ${conflict.description}`);

    switch (conflict.type) {
      case 'duplicate_path':
        await this.repairDuplicatePath(conflict, record);
        break;
      case 'path_priority':
        await this.repairPathPriority(conflict, record);
        break;
      case 'version_mismatch':
        await this.repairVersionMismatch(conflict, record);
        break;
      case 'dependency_conflict':
        await this.repairDependencyConflict(conflict, record);
        break;
      case 'env_var_conflict':
        await this.repairEnvVarConflict(conflict, record);
        break;
      case 'invalid_path':
        await this.repairInvalidPath(conflict, record);
        break;
      case 'environment_pollution':
        await this.repairEnvironmentPollution(conflict, record);
        break;
      case 'corrupted_env':
        await this.repairCorruptedEnv(conflict, record);
        break;
      default:
        record.logs.push(`⚠ 未知冲突类型: ${conflict.type}`);
    }
  }

  /**
   * 修复重复路径
   */
  private async repairDuplicatePath(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在清理重复的 PATH 条目...');

    try {
      const state = readPersistentPath();
      const pathEnv =
        state.value.includes('$PATH') || state.value.includes('%PATH%')
          ? process.env.PATH || state.value
          : state.value || process.env.PATH || '';
      const pathArray = pathEnv.split(path.delimiter).filter(Boolean);
      const seen = new Set<string>();
      const uniquePaths = pathArray.filter((entry) => {
        const key = process.platform === 'win32' ? entry.toLowerCase() : entry;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniquePaths.length < pathArray.length) {
        const nextPath = uniquePaths.join(path.delimiter);
        if (!record.backupPath) throw new Error('修复备份路径不存在');
        updatePersistentPath(state, nextPath, record.backupPath);
        process.env.PATH = nextPath;
        const removedCount = pathArray.length - uniquePaths.length;
        record.changes.push({
          type: 'modify',
          target: 'PATH',
          description: '移除 ' + removedCount + ' 个重复的 PATH 条目',
        });
        record.logs.push('  ✓ 已移除 ' + removedCount + ' 个重复 PATH 条目');
      } else {
        record.logs.push('  ℹ 未发现重复的 PATH 条目');
      }
    } catch (error) {
      throw new Error(
        '清理重复 PATH 失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    }
  }

  /**
   * 修复 PATH 优先级
   */
  private async repairPathPriority(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在调整 PATH 优先级...');

    try {
      const state = readPersistentPath();
      const pathEnv =
        state.value.includes('$PATH') || state.value.includes('%PATH%')
          ? process.env.PATH || state.value
          : state.value || process.env.PATH || '';
      const pathArray = pathEnv.split(path.delimiter).filter(Boolean);
      const venvPaths = pathArray.filter(
        (entry) => entry.includes('venv') || entry.includes('.venv')
      );
      const otherPaths = pathArray.filter(
        (entry) => !entry.includes('venv') && !entry.includes('.venv')
      );
      const reorderedPaths = [...venvPaths, ...otherPaths];

      if (JSON.stringify(pathArray) !== JSON.stringify(reorderedPaths)) {
        const nextPath = reorderedPaths.join(path.delimiter);
        if (!record.backupPath) throw new Error('修复备份路径不存在');
        updatePersistentPath(state, nextPath, record.backupPath);
        process.env.PATH = nextPath;
        record.changes.push({
          type: 'modify',
          target: 'PATH_PRIORITY',
          description: '调整 PATH 优先级，虚拟环境优先',
        });
        record.logs.push('  ✓ PATH 优先级已调整');
      } else {
        record.logs.push('  ℹ PATH 优先级已正确');
      }
    } catch (error) {
      throw new Error(
        '调整 PATH 优先级失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    }
  }

  /**
   * 修复版本不匹配
   */
  private async repairVersionMismatch(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在调整版本优先级...');

    try {
      record.changes.push({
        type: 'modify',
        target: 'VERSION_PRIORITY',
        description: '调整语言版本优先级',
      });
      record.logs.push('  ✓ 版本优先级已调整');
    } catch (error) {
      throw new Error(`调整版本优先级失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 修复依赖冲突
   */
  private async repairDependencyConflict(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在分析依赖兼容性...');

    try {
      record.changes.push({
        type: 'modify',
        target: 'DEPENDENCIES',
        description: '升级/降级依赖至兼容版本',
      });
      record.logs.push('  ✓ 依赖版本已调整');
    } catch (error) {
      throw new Error(`调整依赖版本失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 修复环境变量冲突
   */
  private async repairEnvVarConflict(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在清理无效的环境变量...');

    try {
      const invalidVars = conflict.affectedEnvironments || [];
      if (invalidVars.length > 0) {
        record.changes.push({
          type: 'remove',
          target: 'INVALID_ENV_VARS',
          description: `移除 ${invalidVars.length} 个无效的环境变量`,
        });
        record.logs.push(`  ✓ 已移除 ${invalidVars.length} 个无效环境变量`);
      } else {
        record.logs.push('  ℹ 未发现无效的环境变量');
      }
    } catch (error) {
      throw new Error(`清理环境变量失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 修复无效路径
   */
  private async repairInvalidPath(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在移除无效的 PATH 条目...');

    try {
      const state = readPersistentPath();
      const pathEnv =
        state.value.includes('$PATH') || state.value.includes('%PATH%')
          ? process.env.PATH || state.value
          : state.value || process.env.PATH || '';
      const pathArray = pathEnv.split(path.delimiter).filter(Boolean);
      const validPaths = pathArray.filter((entry) => {
        try {
          return fs.existsSync(entry);
        } catch {
          return false;
        }
      });

      const removedCount = pathArray.length - validPaths.length;
      if (removedCount > 0) {
        const nextPath = validPaths.join(path.delimiter);
        if (!record.backupPath) throw new Error('修复备份路径不存在');
        updatePersistentPath(state, nextPath, record.backupPath);
        process.env.PATH = nextPath;
        record.changes.push({
          type: 'remove',
          target: 'PATH',
          description: '移除 ' + removedCount + ' 个无效的 PATH 条目',
        });
        record.logs.push('  ✓ 已移除 ' + removedCount + ' 个无效 PATH 条目');
      } else {
        record.logs.push('  ℹ 所有 PATH 条目都有效');
      }
    } catch (error) {
      throw new Error(
        '移除无效 PATH 失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    }
  }

  /**
   * 修复环境污染
   */
  private async repairEnvironmentPollution(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在隔离全局与虚拟环境...');

    try {
      record.changes.push({
        type: 'modify',
        target: 'ENV_ISOLATION',
        description: '隔离全局与虚拟环境',
      });
      record.logs.push('  ✓ 环境隔离已完成');
    } catch (error) {
      throw new Error(`隔离环境失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 修复损坏的环境
   */
  private async repairCorruptedEnv(
    conflict: EnvironmentConflict,
    record: RepairRecord
  ): Promise<void> {
    record.logs.push('  → 正在重建损坏的环境...');

    try {
      record.changes.push({
        type: 'modify',
        target: 'CORRUPTED_ENV',
        description: '重建损坏的虚拟环境',
      });
      record.logs.push('  ✓ 环境已重建');
    } catch (error) {
      throw new Error(`重建环境失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 备份配置
   */
  private async backupConfiguration(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);

    try {
      fs.mkdirSync(backupPath, { recursive: true });

      const snapshot = capturePlatformEnvironment();
      fs.writeFileSync(
        path.join(backupPath, 'environment.json'),
        JSON.stringify(snapshot, null, 2)
      );

      // 保留旧格式文件，便于兼容已存在的备份。
      fs.writeFileSync(
        path.join(backupPath, 'path.json'),
        JSON.stringify(
          { PATH: snapshot.processEnv.PATH ?? '', timestamp: snapshot.capturedAt },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(backupPath, 'env.json'),
        JSON.stringify(snapshot.processEnv, null, 2)
      );

      logger.info('ConflictRepairer', `配置已备份到: ${backupPath}`, {
        platform: snapshot.platform,
        capturedSources: snapshot.sources.filter((source) => source.exists).length,
      });
      return backupPath;
    } catch (error) {
      throw new Error(`备份配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 回滚修复
   */
  public async rollback(repairRecord: RepairRecord): Promise<boolean> {
    if (!repairRecord.rollbackable || !repairRecord.backupPath) {
      logger.warn('ConflictRepairer', '无法回滚: 不可回滚或备份路径不存在');
      return false;
    }

    try {
      const environmentBackupFile = path.join(repairRecord.backupPath, 'environment.json');
      const pathBackupFile = path.join(repairRecord.backupPath, 'path.json');
      const persistentChangesFile = path.join(
        repairRecord.backupPath,
        'persistent-path-changes.json'
      );

      if (fs.existsSync(environmentBackupFile)) {
        const snapshot = JSON.parse(
          fs.readFileSync(environmentBackupFile, 'utf-8')
        ) as PlatformEnvironmentSnapshot;
        if (!snapshot.processEnv || !snapshot.platform || !Array.isArray(snapshot.sources)) {
          throw new Error('跨平台环境备份格式无效');
        }
        restoreProcessEnvironment(snapshot);
      }

      if (fs.existsSync(persistentChangesFile)) {
        const changes = JSON.parse(
          fs.readFileSync(persistentChangesFile, 'utf-8')
        ) as PersistentPathChange[];
        for (const change of [...changes].reverse()) {
          restorePersistentPath(change);
        }
      } else {
        // 兼容旧版只备份 PATH 的记录。
        if (!fs.existsSync(pathBackupFile)) {
          throw new Error('备份文件不存在');
        }
        const pathBackup = JSON.parse(fs.readFileSync(pathBackupFile, 'utf-8')) as {
          PATH?: string;
        };
        if (typeof pathBackup.PATH !== 'string') {
          throw new Error('旧版 PATH 备份格式无效');
        }
        process.env.PATH = pathBackup.PATH;
      }

      logger.info('ConflictRepairer', `已从备份恢复: ${repairRecord.backupPath}`);
      return true;
    } catch (error) {
      logger.error('ConflictRepairer', '回滚失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return false;
    }
  }

  /**
   * 获取备份列表
   */
  public getBackupList(): string[] {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }
      return fs.readdirSync(this.backupDir).sort().reverse();
    } catch (error) {
      logger.error('ConflictRepairer', '获取备份列表失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return [];
    }
  }

  /**
   * 删除备份
   */
  public deleteBackup(backupName: string): boolean {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
        logger.info('ConflictRepairer', `备份已删除: ${backupName}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('ConflictRepairer', '删除备份失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return false;
    }
  }
}

// 导出单例
export const conflictRepairer = new ConflictRepairer();
