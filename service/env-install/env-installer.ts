/**
 * 依赖安装服务
 * 负责在指定虚拟环境中安装、升级、卸载依赖包
 */

import { execFileSync, execSync, spawn, type ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../logger/logger';

export interface InstallOptions {
  environmentPath: string;
  environmentType: 'python' | 'node' | 'java' | 'go';
  packages: string[];
  mirrorSource?: string;
  operationId?: string;
  signal?: AbortSignal;
  onProgress?: (progress: InstallProgress) => void;
}

export interface UninstallOptions {
  environmentPath: string;
  environmentType: 'python' | 'node' | 'java' | 'go';
  packages: string[];
}

export interface InstallProgress {
  package: string;
  status: 'installing' | 'success' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export type InstallFailureReason = 'network' | 'permission' | 'peer_conflict' | 'command' | 'cancelled' | 'unknown';

export interface InstallResult {
  success: boolean;
  cancelled?: boolean;
  installed: string[];
  failed: string[];
  message: string;
  details?: Record<string, unknown>;
}

class InstallCancelledError extends Error {
  public readonly code = 'INSTALL_CANCELLED';

  constructor() {
    super('依赖安装已取消');
    this.name = 'InstallCancelledError';
  }
}

export class EnvironmentInstaller {
  private readonly activeProcesses = new Map<string, ChildProcess>();

  public cancel(operationId: string): boolean {
    const child = this.activeProcesses.get(operationId);
    if (!child) return false;
    this.cancelChild(child);
    return true;
  }
  private info(message: string): void {
    logger.info('EnvironmentInstaller', message);
  }

  private error(message: string): void {
    logger.error('EnvironmentInstaller', message);
  }
  /**
   * 安装依赖包
   */
  async installPackages(options: InstallOptions): Promise<InstallResult> {
    const packages = Array.from(
      new Set(options.packages.map((item) => item.trim()).filter(Boolean))
    );
    if (packages.length === 0) {
      return {
        success: false,
        cancelled: false,
        installed: [],
        failed: [],
        message: '没有可安装的依赖包',
      };
    }

    const installed: string[] = [];
    const failed: string[] = [];
    const failureReasons: Record<string, InstallFailureReason> = {};
    const beforeSnapshot = await this.captureInstalledSnapshot(
      options.environmentPath,
      options.environmentType
    );
    let cancelled = false;
    this.info('开始安装依赖: ' + packages.join(', '));

    for (let i = 0; i < packages.length; i += 1) {
      const pkg = packages[i];
      const progress = Math.round(((i + 1) / packages.length) * 100);
      if (options.signal?.aborted) {
        cancelled = true;
        break;
      }
      try {
        options.onProgress?.({
          package: pkg,
          status: 'installing',
          progress,
          message: '正在安装 ' + pkg + '...',
        });
        await this.installSinglePackage(
          options.environmentPath,
          options.environmentType,
          pkg,
          options.mirrorSource,
          options.operationId,
          options.signal
        );
        installed.push(pkg);
        options.onProgress?.({
          package: pkg,
          status: 'success',
          progress,
          message: pkg + ' 安装成功',
        });
      } catch (error) {
        if (error instanceof InstallCancelledError || options.signal?.aborted) {
          cancelled = true;
          options.onProgress?.({
            package: pkg,
            status: 'cancelled',
            progress,
            message: '已取消安装 ' + pkg,
          });
          break;
        }
        const message = error instanceof Error ? error.message : String(error);
        failed.push(pkg);
        failureReasons[pkg] = this.classifyInstallError(message);
        options.onProgress?.({
          package: pkg,
          status: 'failed',
          progress,
          message: pkg + ' 安装失败',
          error: message,
        });
      }
    }

    const remaining = packages.filter((pkg) => !installed.includes(pkg) && !failed.includes(pkg));
    const allFailed = Array.from(new Set(failed.concat(remaining)));
    const success = !cancelled && allFailed.length === 0;
    const message = cancelled
      ? '安装已取消，已完成 ' + installed.length + ' 个，未处理 ' + allFailed.length + ' 个'
      : success
        ? '所有依赖安装成功'
        : installed.length + ' 个成功，' + allFailed.length + ' 个失败';
    const afterSnapshot = await this.captureInstalledSnapshot(
      options.environmentPath,
      options.environmentType
    );
    const addedPackages = beforeSnapshot.available && afterSnapshot.available
      ? afterSnapshot.packages.filter((pkg) => !beforeSnapshot.packages.some((before) =>
          this.packageKey(before, options.environmentType) === this.packageKey(pkg, options.environmentType)
        ))
      : [];
    const consistencyVerified = !cancelled
      && afterSnapshot.available
      && packages.every((pkg) => this.hasPackage(afterSnapshot.packages, pkg, options.environmentType));
    if (!success) this.error(message);
    return {
      success,
      cancelled,
      installed,
      failed: allFailed,
      message,
      details: {
        type: options.environmentType,
        path: options.environmentPath,
        operationId: options.operationId,
        installed,
        failed: allFailed,
        cancelled,
        failureReasons,
        beforePackages: beforeSnapshot.packages,
        afterPackages: afterSnapshot.packages,
        beforeSnapshotAvailable: beforeSnapshot.available,
        afterSnapshotAvailable: afterSnapshot.available,
        snapshotErrors: { before: beforeSnapshot.error, after: afterSnapshot.error },
        addedPackages,
        rollbackCandidatePackages: addedPackages,
        rollbackAvailable: beforeSnapshot.available && afterSnapshot.available && addedPackages.length > 0,
        consistencyVerified,
      },
    };
  }

  /**
   * 安装单个包
   */
  private async installSinglePackage(
    environmentPath: string,
    environmentType: string,
    packageName: string,
    mirrorSource: string | undefined,
    operationId: string | undefined,
    signal: AbortSignal | undefined
  ): Promise<void> {
    this.assertSafeArgument(packageName, '包名');
    if (mirrorSource) this.assertSafeMirror(mirrorSource);
    if (signal?.aborted) throw new InstallCancelledError();
    switch (environmentType) {
      case 'python': {
        const args = ['install', '--disable-pip-version-check'];
        if (mirrorSource) args.push('-i', mirrorSource);
        args.push(packageName);
        await this.runCommand(
          this.getPythonPipPath(environmentPath),
          args,
          environmentPath,
          operationId,
          signal
        );
        break;
      }
      case 'node': {
        const invocation = this.getNodeNpmInvocation(environmentPath);
        await this.runCommand(
          invocation.command,
          invocation.args.concat(['install', packageName]),
          environmentPath,
          operationId,
          signal
        );
        break;
      }
      case 'java':
        if (!fs.existsSync(path.join(environmentPath, 'pom.xml')))
          throw new Error('pom.xml 不存在');
        this.info('Java 包 ' + packageName + ' 需要在 pom.xml 中手动配置');
        break;
      case 'go':
        await this.runCommand('go', ['get', packageName], environmentPath, operationId, signal);
        break;
      default:
        throw new Error('不支持的环境类型: ' + environmentType);
    }
  }

  private runCommand(
    command: string,
    args: string[],
    cwd: string,
    operationId: string | undefined,
    signal: AbortSignal | undefined
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new InstallCancelledError());
        return;
      }
      const child = spawn(command, args, {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });
      if (operationId) this.activeProcesses.set(operationId, child);
      let stderr = '';
      let settled = false;
      const onAbort = (): void => this.cancelChild(child);
      const cleanup = (): void => {
        if (operationId && this.activeProcesses.get(operationId) === child)
          this.activeProcesses.delete(operationId);
        signal?.removeEventListener('abort', onAbort);
      };
      const finish = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      child.stdout?.on('data', () => undefined);
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr = (stderr + chunk.toString()).slice(-4000);
      });
      child.once('error', (error) =>
        finish(() => reject(signal?.aborted ? new InstallCancelledError() : error))
      );
      child.once('close', (code, signalName) =>
        finish(() => {
          if (signal?.aborted) reject(new InstallCancelledError());
          else if (code === 0) resolve();
          else
            reject(
              new Error(
                stderr.trim() ||
                  (signalName ? 'terminated by ' + signalName : 'exit code ' + (code ?? 'unknown'))
              )
            );
        })
      );
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private cancelChild(child: ChildProcess): void {
    try {
      if (child.pid && process.platform === 'win32') {
        execFileSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      } else if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM');
          const processGroupId = -child.pid;
          const forceKillTimer = setTimeout(() => {
            try {
              process.kill(processGroupId, 'SIGKILL');
            } catch {
              // The process group may already have exited.
            }
          }, 250);
          forceKillTimer.unref();
        } catch {
          child.kill('SIGTERM');
        }
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      child.kill();
    }
  }

  private assertSafeArgument(value: string, label: string): void {
    if (!value || /[\r\n\0'";&|<>$]/.test(value) || value.includes(String.fromCharCode(96))) {
      throw new Error(label + '包含不允许的控制或 shell 字符');
    }
  }

  private assertSafeMirror(value: string): void {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error('镜像源必须是有效的 URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol))
      throw new Error('镜像源只允许使用 HTTP 或 HTTPS');
    this.assertSafeArgument(value, '镜像源');
  }

  /**
   * 卸载依赖包
   */
  async uninstallPackages(options: UninstallOptions): Promise<InstallResult> {
    try {
      this.info(`开始卸载依赖: ${options.packages.join(', ')}`);

      const uninstalled: string[] = [];
      const failed: string[] = [];

      for (const pkg of options.packages) {
        try {
          await this.uninstallSinglePackage(options.environmentPath, options.environmentType, pkg);
          uninstalled.push(pkg);
        } catch (err) {
          failed.push(pkg);
        }
      }

      const success = failed.length === 0;
      return {
        success,
        installed: uninstalled,
        failed,
        message: success
          ? '所有依赖卸载成功'
          : `${uninstalled.length} 个成功，${failed.length} 个失败`,
        details: {
          type: options.environmentType,
          path: options.environmentPath,
          uninstalled,
          failed,
        },
      };
    } catch (error) {
      this.error(`依赖卸载失败: ${error}`);
      return {
        success: false,
        installed: [],
        failed: options.packages,
        message: `依赖卸载失败: ${error}`,
      };
    }
  }

  /**
   * 卸载单个包
   */
  private async uninstallSinglePackage(
    environmentPath: string,
    environmentType: string,
    packageName: string
  ): Promise<void> {
    this.assertSafeArgument(packageName, '包名');
    switch (environmentType) {
      case 'python':
        await this.runCommand(
          this.getPythonPipPath(environmentPath),
          ['uninstall', '-y', packageName],
          environmentPath,
          undefined,
          undefined
        );
        return;
      case 'node':
        {
          const invocation = this.getNodeNpmInvocation(environmentPath);
          await this.runCommand(
            invocation.command,
            invocation.args.concat(['uninstall', packageName]),
            environmentPath,
            undefined,
            undefined
          );
        }
        return;
      case 'java':
        this.info('Java 包 ' + packageName + ' 需要手动从 pom.xml 移除');
        return;
      case 'go':
        this.info('Go 包 ' + packageName + ' 需要手动删除源代码');
        return;
      default:
        throw new Error('不支持的环境类型: ' + environmentType);
    }
  }

  private async readInstalledPackages(environmentPath: string, environmentType: string): Promise<string[]> {
    switch (environmentType) {
      case 'python':
        return this.getPythonInstalledPackages(environmentPath);
      case 'node':
        return this.getNodeInstalledPackages(environmentPath);
      case 'java':
        return this.getJavaInstalledPackages(environmentPath);
      case 'go':
        return this.getGoInstalledPackages(environmentPath);
      default:
        return [];
    }
  }

  async getInstalledPackages(environmentPath: string, environmentType: string): Promise<string[]> {
    try {
      return await this.readInstalledPackages(environmentPath, environmentType);
    } catch (error) {
      this.error(`鑾峰彇宸插畨瑁呭寘鍒楄〃澶辫触: ${error}`);
      return [];
    }
  }

  private async captureInstalledSnapshot(
    environmentPath: string,
    environmentType: string
  ): Promise<{ available: boolean; packages: string[]; error?: string }> {
    try {
      return { available: true, packages: await this.readInstalledPackages(environmentPath, environmentType) };
    } catch (error) {
      return {
        available: false,
        packages: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private packageKey(packageName: string, environmentType: string): string {
    const value = packageName.trim().toLowerCase();
    if (environmentType === 'node') {
      if (value.startsWith('@')) {
        const versionSeparator = value.indexOf('@', 1);
        return versionSeparator > 0 ? value.slice(0, versionSeparator) : value;
      }
      return value.split('@')[0];
    }
    return value.split(/[<>=!~]/)[0].trim().replace(/[_]+/g, '-');
  }

  private hasPackage(packages: string[], requested: string, environmentType: string): boolean {
    const requestedKey = this.packageKey(requested, environmentType);
    return packages.some((installed) => this.packageKey(installed, environmentType) === requestedKey);
  }

  private classifyInstallError(message: string): InstallFailureReason {
    if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ENETUNREACH|network|fetch failed|unable to get local issuer/i.test(message)) return 'network';
    if (/EACCES|EPERM|permission denied|access is denied/i.test(message)) return 'permission';
    if (/ERESOLVE|peer (?:dependency|dep)|ResolutionImpossible/i.test(message)) return 'peer_conflict';
    if (/not found|not recognized|exit code|spawn/i.test(message)) return 'command';
    return 'unknown';
  }

  private async getPythonInstalledPackages(environmentPath: string): Promise<string[]> {
    const pipPath = this.getPythonPipPath(environmentPath);
    const output = execSync(`"${pipPath}" list --format=json`, { encoding: 'utf-8' });
    const packages = JSON.parse(output) as Array<{ name: string; version: string }>;
    return packages.map((pkg) => `${pkg.name}==${pkg.version}`);
  }

  /**
   * 获取 Node 已安装包列表
   */
  private async getNodeInstalledPackages(environmentPath: string): Promise<string[]> {
    const npmPath = this.getNodeNpmPath(environmentPath);
    const output = execSync(`"${npmPath}" list --depth=0 --json`, {
      cwd: environmentPath,
      encoding: 'utf-8',
    });
    const data = JSON.parse(output);
    return Object.keys(data.dependencies || {});
  }

  /**
   * 获取 Java 已安装包列表
   */
  private async getJavaInstalledPackages(environmentPath: string): Promise<string[]> {
    // 从 pom.xml 中解析依赖
    const pomPath = path.join(environmentPath, 'pom.xml');
    if (!fs.existsSync(pomPath)) {
      return [];
    }
    // 简化处理，实际应该解析 XML
    return [];
  }

  /**
   * 获取 Go 已安装包列表
   */
  private async getGoInstalledPackages(environmentPath: string): Promise<string[]> {
    try {
      const output = execSync(`go list -m all`, { cwd: environmentPath, encoding: 'utf-8' });
      return output.split('\n').filter((line) => line.trim());
    } catch {
      return [];
    }
  }

  /**
   * 获取 Python pip 路径
   */
  private getPythonPipPath(environmentPath: string): string {
    const isWindows = process.platform === 'win32';
    return isWindows
      ? path.join(environmentPath, 'Scripts', 'pip.exe')
      : path.join(environmentPath, 'bin', 'pip');
  }

  /**
   * 获取 Node npm 路径
   */
  private getNodeNpmInvocation(environmentPath: string): { command: string; args: string[] } {
    const npmPath = this.getNodeNpmPath(environmentPath);
    if (process.platform !== 'win32' || !/\.cmd$/i.test(npmPath)) {
      return { command: npmPath, args: [] };
    }
    const npmDirectory = path.dirname(npmPath);
    const localCli = path.resolve(npmDirectory, '..', 'npm', 'bin', 'npm-cli.js');
    const globalCli = path.join(npmDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js');
    const cliPath = [localCli, globalCli].find((candidate) => fs.existsSync(candidate));
    if (!cliPath) throw new Error('npm CLI 脚本未找到');
    const localNode = path.join(npmDirectory, 'node.exe');
    if (fs.existsSync(localNode)) return { command: localNode, args: [cliPath] };
    const nodePath = execFileSync('where.exe', ['node.exe'], {
      encoding: 'utf-8',
      windowsHide: true,
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (!nodePath) throw new Error('node.exe 不在系统 PATH 中');
    return { command: nodePath, args: [cliPath] };
  }

  private getNodeNpmPath(environmentPath: string): string {
    const isWindows = process.platform === 'win32';
    const localCandidates = isWindows
      ? [
          path.join(environmentPath, 'node_modules', '.bin', 'npm.cmd'),
          path.join(environmentPath, 'node_modules', '.bin', 'npm'),
        ]
      : [path.join(environmentPath, 'node_modules', '.bin', 'npm')];

    const localNpm = localCandidates.find((candidate) => fs.existsSync(candidate));
    if (localNpm) {
      return localNpm;
    }

    // 普通 Node 项目通常没有自己的 npm 可执行文件，回退到系统 PATH。
    const lookupCommand = isWindows ? 'where.exe npm.cmd' : 'command -v npm';
    try {
      const resolvedPath = execSync(lookupCommand, { encoding: 'utf-8' })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (resolvedPath) {
        return resolvedPath;
      }
    } catch {
      // Fall through to a descriptive error below.
    }

    throw new Error('npm executable not found in the project or system PATH');
  }
}

export default EnvironmentInstaller;
