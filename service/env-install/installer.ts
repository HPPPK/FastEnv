/**
 * 依赖包安装服务
 * 在指定虚拟环境中安装、升级、卸载依赖包
 */

import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import type { InstallParams, InstallResult, Dependency, PackageManager } from '../../src/types';
import { logger } from '../logger/logger';

/**
 * 安装进度回调
 */
export type InstallProgressCallback = (progress: {
  stage: 'preparing' | 'installing' | 'verifying' | 'completed';
  percentage: number;
  currentPackage?: string;
  message: string;
  logs: string[];
}) => void;

/**
 * 依赖安装器类
 */
export class DependencyInstaller {
  private progressCallback?: InstallProgressCallback;
  private logs: string[] = [];

  /**
   * 设置进度回调
   */
  public setProgressCallback(callback: InstallProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * 安装依赖
   */
  public async installDependencies(params: InstallParams): Promise<InstallResult> {
    const startTime = Date.now();
    const result: InstallResult = {
      id: `install-${Date.now()}`,
      envId: params.envId,
      timestamp: Date.now(),
      packages: params.packages,
      installed: [],
      failed: [],
      duration: 0,
      success: false,
    };

    this.logs = [];

    try {
      this.emitProgress('preparing', 10, '准备安装环境...');
      this.logs.push(`开始安装 ${params.packages.length} 个依赖包`);

      // 验证环境
      await this.verifyEnvironment(params.envId, params.packageManager);
      this.emitProgress('preparing', 30, '环境验证完成');

      // 安装依赖
      this.emitProgress('installing', 40, '开始安装依赖...');
      const installResults = await this.installPackages(
        params.envId,
        params.packages,
        params.packageManager,
        params.upgradeExisting || false
      );

      result.installed = installResults.installed;
      result.failed = installResults.failed;

      // 验证安装
      this.emitProgress('verifying', 80, '验证安装结果...');
      await this.verifyInstallation(params.envId, result.installed, params.packageManager);

      result.success = result.failed.length === 0;
      result.duration = Date.now() - startTime;

      this.emitProgress('completed', 100, `安装完成: 成功 ${result.installed.length}, 失败 ${result.failed.length}`);
      this.logs.push(`安装完成，耗时 ${result.duration}ms`);

      logger.info('DependencyInstaller', `依赖安装完成: ${result.installed.length} 成功, ${result.failed.length} 失败`);
    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      result.errorMessage = errorMsg;
      this.logs.push(`✗ 安装失败: ${errorMsg}`);
      logger.error('DependencyInstaller', '依赖安装失败', { error: errorMsg });
    }

    return result;
  }

  /**
   * 验证环境
   */
  private async verifyEnvironment(envId: string, packageManager: PackageManager): Promise<void> {
    this.logs.push(`验证环境: ${envId}`);

    try {
      const command = this.getPackageManagerCommand(packageManager, 'version');
      execSync(command, { stdio: 'pipe' });
      this.logs.push(`✓ 环境验证成功`);
    } catch (error) {
      throw new Error(`环境验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 安装包
   */
  private async installPackages(
    envId: string,
    packages: string[],
    packageManager: PackageManager,
    upgradeExisting: boolean
  ): Promise<{ installed: Dependency[]; failed: string[] }> {
    const installed: Dependency[] = [];
    const failed: string[] = [];

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const percentage = 40 + (i / packages.length) * 40;

      try {
        this.emitProgress('installing', percentage, `正在安装: ${pkg}`);
        this.logs.push(`→ 安装 ${pkg}...`);

        const command = this.getPackageManagerCommand(packageManager, 'install', pkg, upgradeExisting);
        execSync(command, { stdio: 'pipe' });

        // 获取安装的版本
        const version = await this.getPackageVersion(packageManager, pkg);

        installed.push({
          name: pkg,
          version,
          packageManager,
          type: 'direct',
          installedAt: Date.now(),
        });

        this.logs.push(`✓ ${pkg}@${version} 安装成功`);
      } catch (error) {
        failed.push(pkg);
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        this.logs.push(`✗ ${pkg} 安装失败: ${errorMsg}`);
        logger.warn('DependencyInstaller', `包安装失败: ${pkg}`, { error: errorMsg });
      }
    }

    return { installed, failed };
  }

  /**
   * 验证安装
   */
  private async verifyInstallation(
    envId: string,
    installed: Dependency[],
    packageManager: PackageManager
  ): Promise<void> {
    this.logs.push(`验证 ${installed.length} 个已安装的包...`);

    for (const dep of installed) {
      try {
        const command = this.getPackageManagerCommand(packageManager, 'show', dep.name);
        execSync(command, { stdio: 'pipe' });
        this.logs.push(`✓ ${dep.name} 验证成功`);
      } catch (error) {
        this.logs.push(`⚠ ${dep.name} 验证失败`);
      }
    }
  }

  /**
   * 获取包管理器命令
   */
  private getPackageManagerCommand(
    packageManager: PackageManager,
    action: 'version' | 'install' | 'show' | 'list',
    packageName?: string,
    upgrade?: boolean
  ): string {
    const platform = os.platform();

    switch (packageManager) {
      case 'pip':
        switch (action) {
          case 'version':
            return 'pip --version';
          case 'install':
            return `pip install ${upgrade ? '--upgrade' : ''} ${packageName}`.trim();
          case 'show':
            return `pip show ${packageName}`;
          case 'list':
            return 'pip list';
          default:
            throw new Error(`未知操作: ${action}`);
        }

      case 'npm':
        switch (action) {
          case 'version':
            return 'npm --version';
          case 'install':
            return `npm install ${upgrade ? '--upgrade' : ''} ${packageName}`.trim();
          case 'show':
            return `npm view ${packageName}`;
          case 'list':
            return 'npm list';
          default:
            throw new Error(`未知操作: ${action}`);
        }

      case 'yarn':
        switch (action) {
          case 'version':
            return 'yarn --version';
          case 'install':
            return `yarn add ${upgrade ? '--upgrade' : ''} ${packageName}`.trim();
          case 'show':
            return `yarn info ${packageName}`;
          case 'list':
            return 'yarn list';
          default:
            throw new Error(`未知操作: ${action}`);
        }

      case 'pnpm':
        switch (action) {
          case 'version':
            return 'pnpm --version';
          case 'install':
            return `pnpm add ${upgrade ? '--upgrade' : ''} ${packageName}`.trim();
          case 'show':
            return `pnpm view ${packageName}`;
          case 'list':
            return 'pnpm list';
          default:
            throw new Error(`未知操作: ${action}`);
        }

      case 'maven':
        switch (action) {
          case 'version':
            return 'mvn --version';
          case 'install':
            return `mvn dependency:get -Dartifact=${packageName}`;
          case 'show':
            return `mvn dependency:tree`;
          case 'list':
            return 'mvn dependency:tree';
          default:
            throw new Error(`未知操作: ${action}`);
        }

      default:
        throw new Error(`不支持的包管理器: ${packageManager}`);
    }
  }

  /**
   * 获取包版本
   */
  private async getPackageVersion(packageManager: PackageManager, packageName: string): Promise<string> {
    try {
      const command = this.getPackageManagerCommand(packageManager, 'show', packageName);
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      // 解析版本号
      if (packageManager === 'pip') {
        const match = output.match(/Version: ([\d.]+)/);
        return match ? match[1] : 'unknown';
      } else if (packageManager === 'npm' || packageManager === 'yarn' || packageManager === 'pnpm') {
        const match = output.match(/"version":\s*"([\d.]+)"/);
        return match ? match[1] : 'unknown';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 卸载依赖
   */
  public async uninstallDependencies(
    envId: string,
    packages: string[],
    packageManager: PackageManager
  ): Promise<{ uninstalled: string[]; failed: string[] }> {
    const uninstalled: string[] = [];
    const failed: string[] = [];

    this.logs = [];
    this.logs.push(`开始卸载 ${packages.length} 个依赖包`);

    for (const pkg of packages) {
      try {
        this.logs.push(`→ 卸载 ${pkg}...`);

        const command = this.getUninstallCommand(packageManager, pkg);
        execSync(command, { stdio: 'pipe' });

        uninstalled.push(pkg);
        this.logs.push(`✓ ${pkg} 卸载成功`);
      } catch (error) {
        failed.push(pkg);
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        this.logs.push(`✗ ${pkg} 卸载失败: ${errorMsg}`);
      }
    }

    return { uninstalled, failed };
  }

  /**
   * 获取卸载命令
   */
  private getUninstallCommand(packageManager: PackageManager, packageName: string): string {
    switch (packageManager) {
      case 'pip':
        return `pip uninstall -y ${packageName}`;
      case 'npm':
        return `npm uninstall ${packageName}`;
      case 'yarn':
        return `yarn remove ${packageName}`;
      case 'pnpm':
        return `pnpm remove ${packageName}`;
      case 'maven':
        return `mvn dependency:purge-local-repository -DactTransitively=false -DreResolve=false`;
      default:
        throw new Error(`不支持的包管理器: ${packageManager}`);
    }
  }

  /**
   * 获取已安装的依赖
   */
  public async getInstalledDependencies(
    envId: string,
    packageManager: PackageManager
  ): Promise<Dependency[]> {
    try {
      const command = this.getPackageManagerCommand(packageManager, 'list');
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      const dependencies: Dependency[] = [];

      // 解析输出
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\S+)\s+([\d.]+)/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2],
            packageManager,
            type: 'direct',
            installedAt: Date.now(),
          });
        }
      }

      return dependencies;
    } catch (error) {
      logger.error('DependencyInstaller', '获取已安装依赖失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return [];
    }
  }

  /**
   * 发送进度更新
   */
  private emitProgress(
    stage: 'preparing' | 'installing' | 'verifying' | 'completed',
    percentage: number,
    message: string,
    currentPackage?: string
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        percentage: Math.min(percentage, 100),
        currentPackage,
        message,
        logs: [...this.logs],
      });
    }
  }

  /**
   * 获取日志
   */
  public getLogs(): string[] {
    return [...this.logs];
  }
}

// 导出单例
export const dependencyInstaller = new DependencyInstaller();
