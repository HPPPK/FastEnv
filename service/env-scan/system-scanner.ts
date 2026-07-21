import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import {
  Environment,
  EnvironmentType,
  EnvironmentStatus,
  Dependency,
  SystemScanResult,
} from '../../src/types/index';
import { Logger } from '../logger/logger';

export class SystemScanner {
  private logger: Logger;
  private isWindows: boolean;

  constructor() {
    this.logger = new Logger('SystemScanner');
    this.isWindows = process.platform === 'win32';
  }

  /**
   * 扫描系统中所有已安装的开发环境
   */
  public async scan(): Promise<SystemScanResult> {
    try {
      this.logger.info('Starting system environment scan...', 'scan');

      const environments: Environment[] = [];

      // 扫描已安装的语言版本
      environments.push(...this.scanInstalledLanguages());

      // 扫描虚拟环境
      environments.push(...this.scanVirtualEnvironments());

      const healthyCount = environments.filter((e) => e.status === 'healthy').length;
      const warningCount = environments.filter((e) => e.status === 'warning').length;
      const errorCount = environments.filter((e) => e.status === 'error').length;

      this.logger.info(`Found ${environments.length} environments`, 'scan');
      return {
        id: `scan-${this.hash(Date.now().toString())}`,
        timestamp: Date.now(),
        platform: process.platform as 'win32' | 'darwin' | 'linux',
        environments,
        installedTools: [],
        pathEntries: [],
        systemVariables: [],
        conflicts: [],
        totalEnvironments: environments.length,
        healthyCount,
        warningCount,
        errorCount,
      };
    } catch (error) {
      this.logger.error(
        'System scan failed',
        error instanceof Error ? error.message : String(error)
      );
      return {
        id: `scan-${this.hash(Date.now().toString())}`,
        timestamp: Date.now(),
        platform: process.platform as 'win32' | 'darwin' | 'linux',
        environments: [],
        installedTools: [],
        pathEntries: [],
        systemVariables: [],
        conflicts: [],
        totalEnvironments: 0,
        healthyCount: 0,
        warningCount: 0,
        errorCount: 0,
      };
    }
  }

  /**
   * 扫描已安装的语言版本
   */
  private scanInstalledLanguages(): Environment[] {
    const environments: Environment[] = [];

    // 扫描 Python
    const pythonVersions = this.scanPythonVersions();
    environments.push(...pythonVersions);

    // 扫描 Node.js
    const nodeVersions = this.scanNodeVersions();
    environments.push(...nodeVersions);

    // 扫描 Java
    const javaVersions = this.scanJavaVersions();
    environments.push(...javaVersions);

    // 扫描 Go
    const goVersions = this.scanGoVersions();
    environments.push(...goVersions);

    return environments;
  }

  /**
   * 扫描 Python 版本
   */
  private scanPythonVersions(): Environment[] {
    const environments: Environment[] = [];

    try {
      const version = this.execute('python --version');
      const match = version.match(/Python (\d+\.\d+\.\d+)/);
      if (match) {
        const pythonPath = this.resolveExecutable('python');
        const dependencies = this.scanPythonDependencies(pythonPath);
        const timestamps = this.getPathTimestamps(pythonPath);
        environments.push({
          id: `env-${this.hash(pythonPath)}`,
          name: 'Python (System)',
          type: 'python' as EnvironmentType,
          version: match[1],
          status: 'healthy' as EnvironmentStatus,
          path: pythonPath,
          dependencies,
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
          tags: ['system', 'python'],
          isVirtual: false,
          projectNote: '',
        });
      }
    } catch (error) {
      // Python not found
    }

    return environments;
  }

  /**
   * 扫描 Node.js 版本
   */
  private scanNodeVersions(): Environment[] {
    const environments: Environment[] = [];

    try {
      const version = this.execute('node --version');
      const match = version.match(/v(\d+\.\d+\.\d+)/);
      if (match) {
        const nodePath = this.resolveExecutable('node');
        const dependencies = this.scanSystemNodeDependencies();
        const timestamps = this.getPathTimestamps(nodePath);
        environments.push({
          id: `env-${this.hash(nodePath)}`,
          name: 'Node.js (System)',
          type: 'node' as EnvironmentType,
          version: match[1],
          status: 'healthy' as EnvironmentStatus,
          path: nodePath,
          dependencies,
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
          tags: ['system', 'node'],
          isVirtual: false,
          projectNote: '',
        });
      }
    } catch (error) {
      // Node not found
    }

    return environments;
  }

  /**
   * 扫描 Java 版本
   */
  private scanJavaVersions(): Environment[] {
    const environments: Environment[] = [];

    try {
      const version = this.execute('java -version 2>&1');
      const match = version.match(/version "(\d+\.\d+\.\d+)/);
      if (match) {
        const javaPath = this.resolveExecutable('java');
        const timestamps = this.getPathTimestamps(javaPath);
        environments.push({
          id: `env-${this.hash(javaPath)}`,
          name: 'Java (System)',
          type: 'java' as EnvironmentType,
          version: match[1],
          status: 'healthy' as EnvironmentStatus,
          path: javaPath,
          dependencies: [] as Dependency[],
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
          tags: ['system', 'java'],
          isVirtual: false,
          projectNote: '',
        });
      }
    } catch (error) {
      // Java not found
    }

    return environments;
  }

  /**
   * 扫描 Go 版本
   */
  private scanGoVersions(): Environment[] {
    const environments: Environment[] = [];

    try {
      const version = this.execute('go version');
      const match = version.match(/go(\d+\.\d+\.\d+)/);
      if (match) {
        const goPath = this.resolveExecutable('go');
        const timestamps = this.getPathTimestamps(goPath);
        environments.push({
          id: `env-${this.hash(goPath)}`,
          name: 'Go (System)',
          type: 'go' as EnvironmentType,
          version: match[1],
          status: 'healthy' as EnvironmentStatus,
          path: goPath,
          dependencies: [] as Dependency[],
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
          tags: ['system', 'go'],
          isVirtual: false,
          projectNote: '',
        });
      }
    } catch (error) {
      // Go not found
    }

    return environments;
  }

  /**
   * 扫描虚拟环境
   */
  private scanVirtualEnvironments(): Environment[] {
    const home = os.homedir();
    const candidates = [
      { name: 'Default venv', type: 'python', dir: path.join(home, '.venv') },
      { name: 'Anaconda', type: 'python', dir: path.join(home, 'anaconda3') },
      { name: 'Miniconda', type: 'python', dir: path.join(home, 'miniconda3') },
      { name: 'NVM', type: 'node', dir: path.join(home, '.nvm') },
    ];

    const environments: Environment[] = candidates
      .filter((candidate) => fs.existsSync(candidate.dir))
      .map((candidate) => {
        const timestamps = this.getPathTimestamps(candidate.dir);
        const env: Environment = {
          id: `env-${this.hash(candidate.dir)}`,
          name: candidate.name,
          type: candidate.type as EnvironmentType,
          version: 'unknown',
          status: 'healthy' as EnvironmentStatus,
          path: candidate.dir,
          dependencies: this.scanEnvironmentDependencies(candidate.dir, candidate.type),
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
          tags: ['detected', 'virtual'],
          isVirtual: true,
          projectNote: '',
        };
        return env;
      });

    // 扫描 conda 虚拟环境列表
    try {
      const condaEnvs = this.scanCondaEnvironments();
      environments.push(...condaEnvs);
    } catch (error) {
      // conda 不可用，忽略错误
    }

    return environments;
  }

  /**
   * 扫描系统级 Python 的依赖
   */
  public scanInstalledDependencies(envPath: string, type: string): Dependency[] {
    return this.scanEnvironmentDependencies(envPath, type);
  }

  /**
   * 扫描指定 Python 可执行文件的完整依赖列表
   */
  private scanPythonDependencies(pythonExecutable: string): Dependency[] {
    try {
      const output = this.execute(`"${pythonExecutable}" -m pip list --format=json`);
      const packages = JSON.parse(output);
      const deps = packages.map((pkg: { name: string; version: string }) => ({
        name: pkg.name,
        version: pkg.version,
        packageManager: 'pip' as const,
      }));
      this.logger.info(`Found ${deps.length} Python dependencies for ${pythonExecutable}`, 'scan');
      return deps;
    } catch (error) {
      this.logger.warn(
        `Failed to scan Python dependencies: ${error instanceof Error ? error.message : String(error)}`,
        'scan'
      );
      return [];
    }
  }

  /**
   * 扫描系统级 Node.js 的依赖
   */
  private scanSystemNodeDependencies(): Dependency[] {
    try {
      const output = this.executeJsonCommand('npm list -g --depth=0 --json');
      const data = JSON.parse(output) as { dependencies?: Record<string, { version?: string }> };
      const packages = data.dependencies || {};
      const deps = Object.entries(packages).map(([name, info]) => ({
        name,
        version: info.version || '0.0.0',
        packageManager: 'npm' as const,
      }));
      this.logger.info(`Found ${deps.length} Node.js dependencies`, 'scan');
      return deps;
    } catch (error) {
      this.logger.warn(
        `Failed to scan Node.js dependencies: ${error instanceof Error ? error.message : String(error)}`,
        'scan'
      );
      return [];
    }
  }

  /**
   * 扫描环境中的依赖
   */
  private scanEnvironmentDependencies(envPath: string, type: string): Dependency[] {
    const dependencies: Dependency[] = [];

    try {
      if (type === 'python') {
        // 使用 pip list 获取 Python 依赖
        const pythonPath = this.isWindows
          ? path.join(envPath, 'Scripts', 'python.exe')
          : path.join(envPath, 'bin', 'python');

        if (fs.existsSync(pythonPath)) {
          try {
            return this.scanPythonDependencies(pythonPath);
          } catch (error) {
            // pip list 失败，返回空数组
          }
        }
      } else if (type === 'node') {
        // 使用 npm list 获取 Node 依赖
        const npmPath = this.isWindows
          ? path.join(envPath, 'npm.cmd')
          : path.join(envPath, 'bin', 'npm');

        if (fs.existsSync(npmPath)) {
          try {
            const output = this.executeJsonCommand(`"${npmPath}" list --depth=0 --json`);
            const data = JSON.parse(output) as {
              dependencies?: Record<string, { version?: string }>;
            };
            if (data.dependencies) {
              return Object.entries(data.dependencies).map(([name, info]) => ({
                name,
                version: info.version || 'unknown',
                packageManager: 'npm' as const,
              }));
            }
          } catch (error) {
            // npm list 失败，返回空数组
          }
        }
      }
    } catch (error) {
      // 扫描失败，返回空数组
    }

    return dependencies;
  }

  /**
   * 扫描 conda 虚拟环境
   */
  private scanCondaEnvironments(): Environment[] {
    try {
      const output = this.execute('conda env list --json');
      const data = JSON.parse(output);
      const envs = data.envs || [];

      return envs
        .filter((envPath: string) => fs.existsSync(envPath))
        .map((envPath: string) => {
          const envName = path.basename(envPath);
          const timestamps = this.getPathTimestamps(envPath);
          return {
            id: `env-${this.hash(envPath)}`,
            name: `Conda: ${envName}`,
            type: 'python' as EnvironmentType,
            version: this.readPythonVersion(envPath),
            status: 'healthy' as EnvironmentStatus,
            path: envPath,
            dependencies: this.scanCondaDependencies(envPath),
            createdAt: timestamps.createdAt,
            updatedAt: timestamps.updatedAt,
            tags: ['detected', 'virtual', 'conda'],
            isVirtual: true,
            projectNote: '',
          };
        });
    } catch (error) {
      return [];
    }
  }

  /**
   * 扫描 Conda 环境中的完整包列表
   */
  private scanCondaDependencies(envPath: string): Dependency[] {
    try {
      const output = this.execute(`conda list -p "${envPath}" --json`);
      const packages = JSON.parse(output);
      const deps = packages.map((pkg: { name: string; version: string }) => ({
        name: pkg.name,
        version: pkg.version,
        packageManager: 'conda' as const,
      }));
      this.logger.info(`Found ${deps.length} Conda dependencies for ${envPath}`, 'scan');
      return deps;
    } catch (error) {
      this.logger.warn(
        `Failed to scan Conda dependencies for ${envPath}: ${error instanceof Error ? error.message : String(error)}`,
        'scan'
      );

      const pythonPath = this.isWindows
        ? path.join(envPath, 'python.exe')
        : path.join(envPath, 'bin', 'python');
      return fs.existsSync(pythonPath) ? this.scanPythonDependencies(pythonPath) : [];
    }
  }

  /**
   * 读取虚拟环境中的 Python 版本
   */
  private readPythonVersion(envPath: string): string {
    try {
      const pythonPath = this.isWindows
        ? path.join(envPath, 'python.exe')
        : path.join(envPath, 'bin', 'python');

      if (fs.existsSync(pythonPath)) {
        const output = this.execute(`"${pythonPath}" --version`);
        const match = output.match(/Python (\d+\.\d+\.\d+)/);
        return match?.[1] ?? 'unknown';
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private getPathTimestamps(targetPath: string): { createdAt: number; updatedAt: number } {
    try {
      const stats = fs.statSync(targetPath);
      const birthTime =
        stats.birthtimeMs && stats.birthtimeMs > 0 ? stats.birthtimeMs : stats.ctimeMs;
      return {
        createdAt: Math.round(birthTime),
        updatedAt: Math.round(stats.mtimeMs || stats.ctimeMs || birthTime),
      };
    } catch {
      const now = Date.now();
      return { createdAt: now, updatedAt: now };
    }
  }

  private resolveExecutable(command: string): string {
    const lookup = this.isWindows ? `where.exe ${command}` : `which ${command}`;
    return this.execute(lookup).split(/\r?\n/)[0].trim();
  }

  /**
   * 执行系统命令
   */
  private execute(command: string): string {
    try {
      return execSync(command, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}`);
    }
  }

  /**
   * 执行会输出 JSON 的命令。部分包管理器在有 peer/extraneous 警告时会用非 0 退出码，
   * 但 stdout 仍然是可用 JSON，这里保留 stdout 而不是直接丢弃扫描结果。
   */
  private executeJsonCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf-8' });
    } catch (error) {
      const commandError = error as Error & { stdout?: unknown };
      const stdout = commandError.stdout !== undefined ? String(commandError.stdout) : '';
      if (stdout.trim()) {
        return stdout;
      }
      throw new Error(`Command failed: ${command}`);
    }
  }

  /**
   * 生成哈希值
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export const systemScanner = new SystemScanner();
