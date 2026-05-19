/**
 * 虚拟环境创建服务
 * 自动创建隔离的开发环境
 */

import { execSync, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import type { Environment, EnvironmentType } from '../../src/types';

export interface EnvironmentCreateProgress {
  operationId: string;
  stage: 'preparing' | 'creating' | 'installing' | 'verifying' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  message: string;
  currentPackage?: string;
}

export interface EnvironmentCreateRunOptions {
  operationId: string;
  signal?: AbortSignal;
  onProgress?: (progress: EnvironmentCreateProgress) => void;
}

/**
 * 环境创建器类
 */
export class EnvironmentCreator {
  private platform = process.platform;
  private isWindows = this.platform === 'win32';
  private activeProcesses = new Map<string, ChildProcessWithoutNullStreams>();

  /**
   * 创建虚拟环境
   */
  public async createEnvironment(
    name: string,
    type: EnvironmentType,
    version: string,
    baseDir?: string,
    dependencies: string[] = [],
    runOptions?: EnvironmentCreateRunOptions
  ): Promise<Environment> {
    this.emitProgress(runOptions, 'preparing', 5, '正在准备环境创建参数...');
    const safeName = this.sanitizeEnvironmentName(name);
    const useConda = type === 'python' && !baseDir && this.isCondaAvailable();
    const envDir = useConda
      ? this.getCondaEnvironmentPath(safeName)
      : baseDir || path.join(os.homedir(), '.envguard', 'envs', safeName);

    if (!useConda && !fs.existsSync(envDir)) {
      fs.mkdirSync(envDir, { recursive: true });
    }

    // 根据类型创建环境
    let environment: Environment;
    switch (type) {
      case 'python':
        environment = await this.createPythonEnv(safeName, version, envDir, useConda, runOptions);
        break;
      case 'node':
        environment = await this.createNodeEnv(name, version, envDir);
        break;
      case 'java':
        environment = await this.createJavaEnv(name, version, envDir);
        break;
      case 'go':
        environment = await this.createGoEnv(name, version, envDir);
        break;
      default:
        throw new Error(`Unsupported environment type: ${type}`);
    }

    if (dependencies.length > 0) {
      await this.installDependencies(type, envDir, dependencies, runOptions);
      this.emitProgress(runOptions, 'verifying', 88, '正在统计已安装依赖...');
      environment.dependencies = this.readInstalledDependencies(type, envDir);
      environment.updatedAt = Date.now();
    }

    this.emitProgress(runOptions, 'completed', 100, '环境创建完成');
    return environment;
  }

  /**
   * 创建 Python 虚拟环境
   */
  private async createPythonEnv(
    name: string,
    version: string,
    envDir: string,
    useConda: boolean,
    runOptions?: EnvironmentCreateRunOptions
  ): Promise<Environment> {
    try {
      if (useConda) {
        if (fs.existsSync(envDir)) {
          throw new Error(`Conda environment already exists: ${envDir}`);
        }
        const pythonSpec = this.toPythonPackageSpec(version);
        this.emitProgress(runOptions, 'creating', 15, `正在创建 Conda 环境 ${name}...`);
        await this.runCommand('conda', ['create', '-y', '-n', name, pythonSpec], runOptions, 'creating');
      } else {
        const pythonLauncher = this.resolvePythonLauncher(version);
        this.emitProgress(runOptions, 'creating', 15, `正在创建 Python 虚拟环境 ${name}...`);
        await this.runCommand(pythonLauncher, ['-m', 'venv', envDir], runOptions, 'creating');
      }

      // 获取 Python 可执行文件路径
      const pythonExe = this.isWindows
        ? path.join(envDir, 'Scripts', 'python.exe')
        : path.join(envDir, 'bin', 'python');

      // 升级 pip
      this.emitProgress(runOptions, 'creating', 35, '正在升级 pip...');
      await this.runCommand(pythonExe, ['-m', 'pip', 'install', '--upgrade', 'pip'], runOptions, 'creating');

      const timestamps = this.getPathTimestamps(envDir);
      return {
        id: `env-${Date.now()}`,
        name,
        type: 'python',
        version: this.readPythonVersion(pythonExe) || version,
        path: envDir,
        status: 'healthy',
        tags: useConda ? ['python', version, 'conda', 'managed'] : ['python', version, 'venv', 'managed'],
        dependencies: [],
        projectNote: useConda
          ? `自动创建的 Conda Python ${version} 环境`
          : `自动创建的 Python ${version} 虚拟环境`,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      };
    } catch (error) {
      throw new Error(
        `Failed to create Python environment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private sanitizeEnvironmentName(name: string): string {
    const sanitized = name.trim().replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '');
    return sanitized || `env_${Date.now().toString(36)}`;
  }

  private isCondaAvailable(): boolean {
    try {
      execSync('conda --version', { encoding: 'utf-8', stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private getCondaEnvironmentPath(name: string): string {
    try {
      const base = execSync('conda info --base', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      return path.join(base, 'envs', name);
    } catch {
      return path.join(os.homedir(), '.envguard', 'envs', name);
    }
  }

  private toPythonPackageSpec(version: string): string {
    const normalized = version === 'latest' ? '' : version.match(/\d+(?:\.\d+)?/)?.[0] ?? '';
    return normalized ? `python=${normalized}` : 'python';
  }

  private resolvePythonLauncher(version: string): string {
    const normalized = version === 'latest' ? '' : version.match(/\d+\.\d+/)?.[0] ?? '';
    const candidates = [
      normalized ? `python${normalized}` : '',
      'python3',
      'python',
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        const output = execSync(`command -v ${candidate}`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
        if (output) return output;
      } catch {
        // Try the next candidate.
      }
    }

    return 'python3';
  }

  private readPythonVersion(pythonExe: string): string | null {
    try {
      const output = execSync(`"${pythonExe}" --version`, { encoding: 'utf-8', stdio: 'pipe' });
      return output.match(/Python\s+(\d+\.\d+\.\d+)/)?.[1] ?? null;
    } catch {
      return null;
    }
  }

  private async installDependencies(
    type: EnvironmentType,
    envDir: string,
    dependencies: string[],
    runOptions?: EnvironmentCreateRunOptions
  ): Promise<void> {
    switch (type) {
      case 'python': {
        const pythonExe = this.isWindows
          ? path.join(envDir, 'python.exe')
          : path.join(envDir, 'bin', 'python');
        for (let index = 0; index < dependencies.length; index += 1) {
          const dependency = dependencies[index];
          const progress = 45 + Math.round((index / dependencies.length) * 35);
          this.emitProgress(runOptions, 'installing', progress, `正在安装 ${dependency}...`, dependency);
          await this.runCommand(
            pythonExe,
            ['-m', 'pip', 'install', dependency],
            runOptions,
            'installing'
          );
        }
        break;
      }
      case 'node': {
        this.emitProgress(runOptions, 'installing', 45, `正在安装 ${dependencies.join(', ')}...`);
        await this.runCommand('npm', ['install', ...dependencies], runOptions, 'installing', envDir);
        break;
      }
      case 'go': {
        for (const dependency of dependencies) {
          execSync(`go get "${dependency}"`, { cwd: envDir, stdio: 'inherit' });
        }
        break;
      }
      default:
        break;
    }
  }

  public cancel(operationId: string): boolean {
    const child = this.activeProcesses.get(operationId);
    if (!child) {
      return false;
    }

    child.kill('SIGTERM');
    this.activeProcesses.delete(operationId);
    return true;
  }

  private emitProgress(
    runOptions: EnvironmentCreateRunOptions | undefined,
    stage: EnvironmentCreateProgress['stage'],
    progress: number,
    message: string,
    currentPackage?: string
  ): void {
    if (!runOptions) return;
    runOptions.onProgress?.({
      operationId: runOptions.operationId,
      stage,
      progress,
      message,
      currentPackage,
    });
  }

  private async runCommand(
    command: string,
    args: string[],
    runOptions: EnvironmentCreateRunOptions | undefined,
    stage: EnvironmentCreateProgress['stage'],
    cwd?: string
  ): Promise<void> {
    if (runOptions?.signal?.aborted) {
      throw new Error('操作已取消');
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ''}`,
        },
      });

      if (runOptions) {
        this.activeProcesses.set(runOptions.operationId, child);
      }

      const cleanup = () => {
        if (runOptions) {
          this.activeProcesses.delete(runOptions.operationId);
        }
        runOptions?.signal?.removeEventListener('abort', abortHandler);
      };

      const abortHandler = () => {
        child.kill('SIGTERM');
      };

      runOptions?.signal?.addEventListener('abort', abortHandler);

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text) {
          this.emitProgress(runOptions, stage, 0, text);
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text) {
          this.emitProgress(runOptions, stage, 0, text);
        }
      });

      child.on('error', (error) => {
        cleanup();
        reject(error);
      });

      child.on('close', (code, signal) => {
        cleanup();
        if (runOptions?.signal?.aborted || signal === 'SIGTERM') {
          reject(new Error('操作已取消'));
          return;
        }

        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      });
    });
  }

  private readInstalledDependencies(type: EnvironmentType, envDir: string) {
    try {
      if (type === 'python') {
        const pythonExe = this.isWindows
          ? path.join(envDir, 'Scripts', 'python.exe')
          : path.join(envDir, 'bin', 'python');
        const output = execSync(`"${pythonExe}" -m pip list --format=json`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        return JSON.parse(output).map((pkg: { name: string; version: string }) => ({
          name: pkg.name,
          version: pkg.version,
          packageManager: 'pip' as const,
        }));
      }

      if (type === 'node') {
        const output = execSync('npm list --depth=0 --json', {
          cwd: envDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        const data = JSON.parse(output);
        return Object.entries(data.dependencies ?? {}).map(([name, info]: [string, any]) => ({
          name,
          version: info.version ?? 'unknown',
          packageManager: 'npm' as const,
        }));
      }
    } catch {
      return [];
    }

    return [];
  }

  /**
   * 创建 Node.js 环境
   */
  private async createNodeEnv(
    name: string,
    version: string,
    envDir: string
  ): Promise<Environment> {
    try {
      // 创建 Node.js 环境目录
      fs.mkdirSync(envDir, { recursive: true });

      // 创建 package.json
      const packageJson = {
        name,
        version: '1.0.0',
        description: `Node.js ${version} environment`,
        main: 'index.js',
        scripts: {},
        dependencies: {},
      };

      fs.writeFileSync(
        path.join(envDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const timestamps = this.getPathTimestamps(envDir);
      return {
        id: `env-${Date.now()}`,
        name,
        type: 'node',
        version,
        path: envDir,
        status: 'healthy',
        tags: ['node', version],
        dependencies: [],
        projectNote: `自动创建的 Node.js ${version} 环境`,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      };
    } catch (error) {
      throw new Error(
        `Failed to create Node.js environment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 创建 Java 环境
   */
  private async createJavaEnv(
    name: string,
    version: string,
    envDir: string
  ): Promise<Environment> {
    try {
      fs.mkdirSync(envDir, { recursive: true });

      const timestamps = this.getPathTimestamps(envDir);
      return {
        id: `env-${Date.now()}`,
        name,
        type: 'java',
        version,
        path: envDir,
        status: 'healthy',
        tags: ['java', version],
        dependencies: [],
        projectNote: `自动创建的 Java ${version} 环境`,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      };
    } catch (error) {
      throw new Error(
        `Failed to create Java environment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 创建 Go 环境
   */
  private async createGoEnv(
    name: string,
    version: string,
    envDir: string
  ): Promise<Environment> {
    try {
      fs.mkdirSync(envDir, { recursive: true });

      const timestamps = this.getPathTimestamps(envDir);
      return {
        id: `env-${Date.now()}`,
        name,
        type: 'go',
        version,
        path: envDir,
        status: 'healthy',
        tags: ['go', version],
        dependencies: [],
        projectNote: `自动创建的 Go ${version} 环境`,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      };
    } catch (error) {
      throw new Error(
        `Failed to create Go environment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 删除环境
   */
  public async deleteEnvironment(envPath: string): Promise<boolean> {
    try {
      if (this.isCondaEnvironmentPath(envPath)) {
        try {
          execSync(`conda env remove -y -p "${envPath}"`, {
            stdio: 'pipe',
            env: {
              ...process.env,
              PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ''}`,
            },
          });
        } catch {
          // Fall through to removing any residual directory below.
        }
      }

      if (fs.existsSync(envPath)) {
        fs.rmSync(envPath, { recursive: true, force: true });
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(
        `Failed to delete environment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private isCondaEnvironmentPath(envPath: string): boolean {
    try {
      const base = execSync('conda info --base', {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ''}`,
        },
      }).trim();
      return envPath.startsWith(path.join(base, 'envs'));
    } catch {
      return false;
    }
  }

  private getPathTimestamps(targetPath: string): { createdAt: number; updatedAt: number } {
    try {
      const stats = fs.statSync(targetPath);
      const birthTime = stats.birthtimeMs && stats.birthtimeMs > 0 ? stats.birthtimeMs : stats.ctimeMs;
      return {
        createdAt: Math.round(birthTime),
        updatedAt: Math.round(stats.mtimeMs || stats.ctimeMs || birthTime),
      };
    } catch {
      const now = Date.now();
      return { createdAt: now, updatedAt: now };
    }
  }
}

// 导出单例
export const environmentCreator = new EnvironmentCreator();
