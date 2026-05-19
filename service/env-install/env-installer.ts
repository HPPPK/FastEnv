/**
 * 依赖安装服务
 * 负责在指定虚拟环境中安装、升级、卸载依赖包
 */

import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface InstallOptions {
  environmentPath: string;
  environmentType: 'python' | 'node' | 'java' | 'go';
  packages: string[];
  mirrorSource?: string;
  onProgress?: (progress: InstallProgress) => void;
}

export interface UninstallOptions {
  environmentPath: string;
  environmentType: 'python' | 'node' | 'java' | 'go';
  packages: string[];
}

export interface InstallProgress {
  package: string;
  status: 'installing' | 'success' | 'failed';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface InstallResult {
  success: boolean;
  installed: string[];
  failed: string[];
  message: string;
  details?: Record<string, any>;
}

export class EnvironmentInstaller {
  private log(level: string, message: string): void {
    console.log(`[${level}] [EnvironmentInstaller] ${message}`);
  }

  private info(message: string): void {
    this.log('INFO', message);
  }

  private error(message: string): void {
    this.log('ERROR', message);
  }

  /**
   * 安装依赖包
   */
  async installPackages(options: InstallOptions): Promise<InstallResult> {
    try {
      this.info(`开始安装依赖: ${options.packages.join(', ')}`);

      const installed: string[] = [];
      const failed: string[] = [];

      for (let i = 0; i < options.packages.length; i++) {
        const pkg = options.packages[i];
        const progress = Math.round(((i + 1) / options.packages.length) * 100);

        try {
          options.onProgress?.({
            package: pkg,
            status: 'installing',
            progress,
            message: `正在安装 ${pkg}...`,
          });

          await this.installSinglePackage(options.environmentPath, options.environmentType, pkg, options.mirrorSource);

          installed.push(pkg);
          options.onProgress?.({
            package: pkg,
            status: 'success',
            progress,
            message: `${pkg} 安装成功`,
          });
        } catch (err) {
          failed.push(pkg);
          options.onProgress?.({
            package: pkg,
            status: 'failed',
            progress,
            message: `${pkg} 安装失败`,
            error: String(err),
          });
        }
      }

      const success = failed.length === 0;
      return {
        success,
        installed,
        failed,
        message: success ? '所有依赖安装成功' : `${installed.length} 个成功，${failed.length} 个失败`,
        details: {
          type: options.environmentType,
          path: options.environmentPath,
          installed,
          failed,
        },
      };
    } catch (error) {
      this.error(`依赖安装失败: ${error}`);
      return {
        success: false,
        installed: [],
        failed: options.packages,
        message: `依赖安装失败: ${error}`,
      };
    }
  }

  /**
   * 安装单个包
   */
  private async installSinglePackage(
    environmentPath: string,
    environmentType: string,
    packageName: string,
    mirrorSource?: string
  ): Promise<void> {
    switch (environmentType) {
      case 'python':
        await this.installPythonPackage(environmentPath, packageName, mirrorSource);
        break;
      case 'node':
        await this.installNodePackage(environmentPath, packageName);
        break;
      case 'java':
        await this.installJavaPackage(environmentPath, packageName);
        break;
      case 'go':
        await this.installGoPackage(environmentPath, packageName);
        break;
      default:
        throw new Error(`不支持的环境类型: ${environmentType}`);
    }
  }

  /**
   * 安装 Python 包
   */
  private async installPythonPackage(environmentPath: string, packageName: string, mirrorSource?: string): Promise<void> {
    const pipPath = this.getPythonPipPath(environmentPath);
    const cmd = mirrorSource
      ? `"${pipPath}" install -i ${mirrorSource} ${packageName}`
      : `"${pipPath}" install ${packageName}`;

    execSync(cmd, { stdio: 'inherit' } as any);
  }

  /**
   * 安装 Node 包
   */
  private async installNodePackage(environmentPath: string, packageName: string): Promise<void> {
    const npmPath = this.getNodeNpmPath(environmentPath);
    execSync(`"${npmPath}" install ${packageName}`, { cwd: environmentPath, stdio: 'inherit' } as any);
  }

  /**
   * 安装 Java 包（通过 Maven）
   */
  private async installJavaPackage(environmentPath: string, packageName: string): Promise<void> {
    // Java 包通过 Maven 管理，需要修改 pom.xml
    const pomPath = path.join(environmentPath, 'pom.xml');
    if (!fs.existsSync(pomPath)) {
      throw new Error('pom.xml 不存在');
    }

    // 这里简化处理，实际应该解析 XML 并添加依赖
    this.info(`Java 包 ${packageName} 需要在 pom.xml 中手动配置`);
  }

  /**
   * 安装 Go 包
   */
  private async installGoPackage(environmentPath: string, packageName: string): Promise<void> {
    execSync(`go get ${packageName}`, { cwd: environmentPath, stdio: 'inherit' } as any);
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
        message: success ? '所有依赖卸载成功' : `${uninstalled.length} 个成功，${failed.length} 个失败`,
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
    switch (environmentType) {
      case 'python':
        await this.uninstallPythonPackage(environmentPath, packageName);
        break;
      case 'node':
        await this.uninstallNodePackage(environmentPath, packageName);
        break;
      case 'java':
        await this.uninstallJavaPackage(environmentPath, packageName);
        break;
      case 'go':
        await this.uninstallGoPackage(environmentPath, packageName);
        break;
      default:
        throw new Error(`不支持的环境类型: ${environmentType}`);
    }
  }

  /**
   * 卸载 Python 包
   */
  private async uninstallPythonPackage(environmentPath: string, packageName: string): Promise<void> {
    const pipPath = this.getPythonPipPath(environmentPath);
    execSync(`"${pipPath}" uninstall -y ${packageName}`, { stdio: 'inherit' } as any);
  }

  /**
   * 卸载 Node 包
   */
  private async uninstallNodePackage(environmentPath: string, packageName: string): Promise<void> {
    const npmPath = this.getNodeNpmPath(environmentPath);
    execSync(`"${npmPath}" uninstall ${packageName}`, { cwd: environmentPath, stdio: 'inherit' } as any);
  }

  /**
   * 卸载 Java 包
   */
  private async uninstallJavaPackage(environmentPath: string, packageName: string): Promise<void> {
    this.info(`Java 包 ${packageName} 需要在 pom.xml 中手动移除`);
  }

  /**
   * 卸载 Go 包
   */
  private async uninstallGoPackage(environmentPath: string, packageName: string): Promise<void> {
    // Go 没有标准的卸载命令，只能删除源代码
    this.info(`Go 包 ${packageName} 需要手动删除源代码`);
  }

  /**
   * 获取已安装的包列表
   */
  async getInstalledPackages(environmentPath: string, environmentType: string): Promise<string[]> {
    try {
      switch (environmentType) {
        case 'python':
          return await this.getPythonInstalledPackages(environmentPath);
        case 'node':
          return await this.getNodeInstalledPackages(environmentPath);
        case 'java':
          return await this.getJavaInstalledPackages(environmentPath);
        case 'go':
          return await this.getGoInstalledPackages(environmentPath);
        default:
          return [];
      }
    } catch (error) {
      this.error(`获取已安装包列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取 Python 已安装包列表
   */
  private async getPythonInstalledPackages(environmentPath: string): Promise<string[]> {
    const pipPath = this.getPythonPipPath(environmentPath);
    const output = execSync(`"${pipPath}" list --format=json`, { encoding: 'utf-8' });
    const packages = JSON.parse(output);
    return packages.map((pkg: any) => `${pkg.name}==${pkg.version}`);
  }

  /**
   * 获取 Node 已安装包列表
   */
  private async getNodeInstalledPackages(environmentPath: string): Promise<string[]> {
    const npmPath = this.getNodeNpmPath(environmentPath);
    const output = execSync(`"${npmPath}" list --depth=0 --json`, { cwd: environmentPath, encoding: 'utf-8' });
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
  private getNodeNpmPath(environmentPath: string): string {
    const isWindows = process.platform === 'win32';
    return isWindows
      ? path.join(environmentPath, 'node_modules', '.bin', 'npm.cmd')
      : path.join(environmentPath, 'node_modules', '.bin', 'npm');
  }
}

export default EnvironmentInstaller;
