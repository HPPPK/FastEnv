/**
 * 环境冲突检测服务
 * 检测系统中的各类环境冲突
 */

import type { EnvironmentConflict, ConflictType, Environment, SystemScanResult } from '../../src/types';

/**
 * 冲突检测器类
 */
export class ConflictDetector {
  /**
   * 检测所有冲突
   */
  public detectConflicts(
    environments: Environment[],
    scanResult: SystemScanResult
  ): EnvironmentConflict[] {
    const conflicts: EnvironmentConflict[] = [];

    // 检测 PATH 优先级冲突
    conflicts.push(...this.detectPathConflicts(scanResult));

    // 检测版本冲突
    conflicts.push(...this.detectVersionConflicts(environments));

    // 检测依赖冲突
    conflicts.push(...this.detectDependencyConflicts(environments));

    // 检测环境变量冲突
    conflicts.push(...this.detectEnvVarConflicts(scanResult));

    // 检测镜像源失效
    conflicts.push(...this.detectMirrorFailures());

    // 检测权限问题
    conflicts.push(...this.detectPermissionIssues(environments));

    return conflicts;
  }

  /**
   * 检测 PATH 优先级冲突
   */
  private detectPathConflicts(scanResult: SystemScanResult): EnvironmentConflict[] {
    const conflicts: EnvironmentConflict[] = [];
    const pathEntries = scanResult.globalPath ?? scanResult.pathEntries;

    // 检测无效路径
    const invalidPaths = pathEntries.filter((p) => !p.isValid);
    if (invalidPaths.length > 0) {
      conflicts.push({
        id: `conflict-invalid-path-${Date.now()}`,
        type: 'duplicate_path' as ConflictType,
        severity: 'medium',
        description: `检测到 ${invalidPaths.length} 个无效的 PATH 条目`,
        affectedEnvironments: [],
        suggestedFix: '移除无效的 PATH 条目',
        autoFixable: true,
        detectedAt: Date.now(),
      });
    }

    // 检测重复路径
    const pathStrings = pathEntries.map((p) => p.path);
    const duplicates = pathStrings.filter(
      (p, i) => pathStrings.indexOf(p) !== i
    );
    if (duplicates.length > 0) {
      conflicts.push({
        id: `conflict-dup-path-${Date.now()}`,
        type: 'duplicate_path' as ConflictType,
        severity: 'low',
        description: `检测到 ${duplicates.length} 个重复的 PATH 条目`,
        affectedEnvironments: [],
        suggestedFix: '清理重复的 PATH 条目',
        autoFixable: true,
        detectedAt: Date.now(),
      });
    }

    return conflicts;
  }

  /**
   * 检测版本冲突
   */
  private detectVersionConflicts(environments: Environment[]): EnvironmentConflict[] {
    const conflicts: EnvironmentConflict[] = [];

    // 按类型分组环境
    const envsByType = new Map<string, Environment[]>();
    environments.forEach((env) => {
      if (!envsByType.has(env.type)) {
        envsByType.set(env.type, []);
      }
      envsByType.get(env.type)!.push(env);
    });

    // 检测同类型多版本冲突
    envsByType.forEach((envs, type) => {
      if (envs.length > 1) {
        const versions = envs.map((e) => e.version);
        const uniqueVersions = new Set(versions);

        if (uniqueVersions.size > 1) {
          conflicts.push({
            id: `conflict-version-${type}-${Date.now()}`,
            type: 'version_mismatch' as ConflictType,
            severity: 'medium',
            description: `检测到 ${type} 的多个版本: ${Array.from(uniqueVersions).join(', ')}`,
            affectedEnvironments: envs.map((e) => e.id),
            suggestedFix: '统一版本或明确指定优先级',
            autoFixable: false,
            detectedAt: Date.now(),
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * 检测依赖冲突
   */
  private detectDependencyConflicts(environments: Environment[]): EnvironmentConflict[] {
    const conflicts: EnvironmentConflict[] = [];

    environments.forEach((env) => {
      const depMap = new Map<string, string[]>();

      // 统计依赖版本
      env.dependencies.forEach((dep) => {
        if (!depMap.has(dep.name)) {
          depMap.set(dep.name, []);
        }
        depMap.get(dep.name)!.push(dep.version);
      });

      // 检测同一依赖的多个版本
      depMap.forEach((versions, depName) => {
        const uniqueVersions = new Set(versions);
        if (uniqueVersions.size > 1) {
          conflicts.push({
            id: `conflict-dep-${env.id}-${depName}-${Date.now()}`,
            type: 'dependency_conflict' as ConflictType,
            severity: 'high',
            description: `环境 "${env.name}" 中依赖 "${depName}" 存在多个版本: ${Array.from(uniqueVersions).join(', ')}`,
            affectedEnvironments: [env.id],
            suggestedFix: `统一 ${depName} 的版本`,
            autoFixable: true,
            detectedAt: Date.now(),
          });
        }
      });
    });

    return conflicts;
  }

  /**
   * 检测环境变量冲突
   */
  private detectEnvVarConflicts(scanResult: SystemScanResult): EnvironmentConflict[] {
    const conflicts: EnvironmentConflict[] = [];
    const vars = scanResult.systemVariables;

    // 检测无效的环境变量
    const invalidVars = vars.filter((v) => !v.isValid);
    if (invalidVars.length > 0) {
      conflicts.push({
        id: `conflict-env-var-${Date.now()}`,
        type: 'env_var_conflict' as ConflictType,
        severity: 'medium',
        description: `检测到 ${invalidVars.length} 个无效的环境变量`,
        affectedEnvironments: [],
        suggestedFix: '清理无效的环境变量',
        autoFixable: true,
        detectedAt: Date.now(),
      });
    }

    return conflicts;
  }

  /**
   * 检测镜像源失效
   */
  private detectMirrorFailures(): EnvironmentConflict[] {
    // 这里可以添加实际的镜像源检测逻辑
    return [];
  }

  /**
   * 检测权限问题
   */
  private detectPermissionIssues(environments: Environment[]): EnvironmentConflict[] {
    const conflicts: EnvironmentConflict[] = [];

    environments.forEach((env) => {
      // 这里可以添加实际的权限检测逻辑
      // 例如检查环境路径是否可读写
    });

    return conflicts;
  }
}

// 导出单例
export const conflictDetector = new ConflictDetector();
