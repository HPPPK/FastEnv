/**
 * 环境创建服务
 * 负责自动创建虚拟环境（Python venv/conda、Node、Java 等）
 */

import { execSync } from 'child_process';
import { logger } from '../logger/logger';
import * as path from 'path';
import * as fs from 'fs';

export interface CreateEnvironmentOptions {
  name: string;
  type: 'python' | 'node' | 'java' | 'go';
  version?: string;
  basePath?: string;
  dependencies?: string[];
  mirrorSource?: string;
}

export interface CreateEnvironmentResult {
  success: boolean;
  environmentId: string;
  environmentPath: string;
  message: string;
  details?: Record<string, unknown>;
}

export class EnvironmentCreator {
  private info(message: string): void {
    logger.info('EnvironmentCreator', message);
  }

  private error(message: string): void {
    logger.error('EnvironmentCreator', message);
  }

  /**
   * 创建虚拟环境
   */
  async createEnvironment(options: CreateEnvironmentOptions): Promise<CreateEnvironmentResult> {
    try {
      this.info(`开始创建 ${options.type} 环境: ${options.name}`);

      const basePath = options.basePath || this.getDefaultBasePath();
      const environmentPath = path.join(basePath, options.name);

      // 检查环境是否已存在
      if (fs.existsSync(environmentPath)) {
        return {
          success: false,
          environmentId: '',
          environmentPath,
          message: `环境已存在: ${environmentPath}`,
        };
      }

      // 根据类型创建环境
      let result: CreateEnvironmentResult;
      switch (options.type) {
        case 'python':
          result = await this.createPythonEnvironment(options, environmentPath);
          break;
        case 'node':
          result = await this.createNodeEnvironment(options, environmentPath);
          break;
        case 'java':
          result = await this.createJavaEnvironment(options, environmentPath);
          break;
        case 'go':
          result = await this.createGoEnvironment(options, environmentPath);
          break;
        default:
          return {
            success: false,
            environmentId: '',
            environmentPath,
            message: `不支持的环境类型: ${options.type}`,
          };
      }

      if (result.success) {
        this.info(`环境创建成功: ${options.name}`);
        // 安装初始依赖
        if (options.dependencies && options.dependencies.length > 0) {
          await this.installDependencies(
            options.type,
            environmentPath,
            options.dependencies,
            options.mirrorSource
          );
        }
      }

      return result;
    } catch (error) {
      this.error(`环境创建失败: ${error}`);
      return {
        success: false,
        environmentId: '',
        environmentPath: '',
        message: `环境创建失败: ${error}`,
      };
    }
  }

  /**
   * 创建 Python 虚拟环境
   */
  private async createPythonEnvironment(
    options: CreateEnvironmentOptions,
    environmentPath: string
  ): Promise<CreateEnvironmentResult> {
    try {
      const version = options.version || '3.11';

      // 创建 venv 虚拟环境
      execSync(`python${version} -m venv "${environmentPath}"`, { stdio: 'inherit' });

      // 升级 pip
      const pipPath = this.getPythonPipPath(environmentPath);
      execSync(`"${pipPath}" install --upgrade pip`, { stdio: 'inherit' });

      return {
        success: true,
        environmentId: this.generateEnvironmentId(),
        environmentPath,
        message: `Python ${version} 虚拟环境创建成功`,
        details: {
          type: 'python',
          version,
          path: environmentPath,
        },
      };
    } catch (error) {
      this.error(`Python 环境创建失败: ${error}`);
      return {
        success: false,
        environmentId: '',
        environmentPath,
        message: `Python 环境创建失败: ${error}`,
      };
    }
  }

  /**
   * 创建 Node 环境
   */
  private async createNodeEnvironment(
    options: CreateEnvironmentOptions,
    environmentPath: string
  ): Promise<CreateEnvironmentResult> {
    try {
      const version = options.version || 'latest';

      // 创建环境目录
      fs.mkdirSync(environmentPath, { recursive: true });

      // 初始化 package.json
      const packageJson = {
        name: options.name,
        version: '1.0.0',
        description: `Node.js 开发环境 - ${options.name}`,
        main: 'index.js',
        scripts: {
          start: 'node index.js',
        },
        keywords: [],
        author: '',
        license: 'ISC',
      };

      fs.writeFileSync(
        path.join(environmentPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // 创建 .npmrc 配置文件（配置镜像源）
      if (options.mirrorSource) {
        fs.writeFileSync(path.join(environmentPath, '.npmrc'), `registry=${options.mirrorSource}`);
      }

      return {
        success: true,
        environmentId: this.generateEnvironmentId(),
        environmentPath,
        message: `Node.js 环境创建成功`,
        details: {
          type: 'node',
          version,
          path: environmentPath,
        },
      };
    } catch (error) {
      this.error(`Node 环境创建失败: ${error}`);
      return {
        success: false,
        environmentId: '',
        environmentPath,
        message: `Node 环境创建失败: ${error}`,
      };
    }
  }

  /**
   * 创建 Java 环境
   */
  private async createJavaEnvironment(
    options: CreateEnvironmentOptions,
    environmentPath: string
  ): Promise<CreateEnvironmentResult> {
    try {
      const version = options.version || '17';

      // 创建环境目录
      fs.mkdirSync(environmentPath, { recursive: true });

      // 创建 .env 文件配置 JAVA_HOME
      const envContent = `JAVA_VERSION=${version}\nJAVA_HOME=${environmentPath}/jdk\n`;
      fs.writeFileSync(path.join(environmentPath, '.env'), envContent);

      // 创建 pom.xml 模板（如果需要 Maven）
      const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>${options.name}</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.source>${version}</maven.compiler.source>
        <maven.compiler.target>${version}</maven.compiler.target>
    </properties>
</project>`;

      fs.writeFileSync(path.join(environmentPath, 'pom.xml'), pomXml);

      return {
        success: true,
        environmentId: this.generateEnvironmentId(),
        environmentPath,
        message: `Java ${version} 环境创建成功`,
        details: {
          type: 'java',
          version,
          path: environmentPath,
        },
      };
    } catch (error) {
      this.error(`Java 环境创建失败: ${error}`);
      return {
        success: false,
        environmentId: '',
        environmentPath,
        message: `Java 环境创建失败: ${error}`,
      };
    }
  }

  /**
   * 创建 Go 环境
   */
  private async createGoEnvironment(
    options: CreateEnvironmentOptions,
    environmentPath: string
  ): Promise<CreateEnvironmentResult> {
    try {
      const version = options.version || '1.21';

      // 创建环境目录结构
      fs.mkdirSync(path.join(environmentPath, 'src'), { recursive: true });
      fs.mkdirSync(path.join(environmentPath, 'bin'), { recursive: true });
      fs.mkdirSync(path.join(environmentPath, 'pkg'), { recursive: true });

      // 创建 go.mod 文件
      const goMod = `module ${options.name}\n\ngo ${version}\n`;
      fs.writeFileSync(path.join(environmentPath, 'go.mod'), goMod);

      // 创建 .env 文件
      const envContent = `GOVERSION=${version}\nGOPATH=${environmentPath}\n`;
      fs.writeFileSync(path.join(environmentPath, '.env'), envContent);

      return {
        success: true,
        environmentId: this.generateEnvironmentId(),
        environmentPath,
        message: `Go ${version} 环境创建成功`,
        details: {
          type: 'go',
          version,
          path: environmentPath,
        },
      };
    } catch (error) {
      this.error(`Go 环境创建失败: ${error}`);
      return {
        success: false,
        environmentId: '',
        environmentPath,
        message: `Go 环境创建失败: ${error}`,
      };
    }
  }

  /**
   * 安装依赖
   */
  private async installDependencies(
    type: string,
    environmentPath: string,
    dependencies: string[],
    mirrorSource?: string
  ): Promise<void> {
    try {
      this.info(`开始安装依赖: ${dependencies.join(', ')}`);

      switch (type) {
        case 'python': {
          const pipPath = this.getPythonPipPath(environmentPath);
          for (const dep of dependencies) {
            const cmd = mirrorSource
              ? `"${pipPath}" install -i ${mirrorSource} ${dep}`
              : `"${pipPath}" install ${dep}`;
            execSync(cmd, { stdio: 'inherit' });
          }
          break;
        }

        case 'node': {
          const npmPath = this.getNodeNpmPath(environmentPath);
          for (const dep of dependencies) {
            execSync(`"${npmPath}" install ${dep}`, {
              cwd: environmentPath,
              stdio: 'inherit',
            });
          }
          break;
        }

        case 'java':
          // Java 依赖通过 Maven 管理，这里只记录日志
          this.info(`Java 依赖需要在 pom.xml 中配置`);
          break;

        case 'go':
          // Go 依赖通过 go get 管理
          for (const dep of dependencies) {
            execSync(`go get ${dep}`, { cwd: environmentPath, stdio: 'inherit' });
          }
          break;
      }

      this.info(`依赖安装完成`);
    } catch (error) {
      this.error(`依赖安装失败: ${error}`);
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

  /**
   * 获取默认基础路径
   */
  private getDefaultBasePath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.envguard', 'environments');
  }

  /**
   * 生成环境 ID
   */
  private generateEnvironmentId(): string {
    return `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default EnvironmentCreator;
