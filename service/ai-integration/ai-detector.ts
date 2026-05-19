/**
 * AI 客户端检测服务
 * 自动检测用户电脑上已安装并登录的 AI 客户端
 * 支持：豆包、DeepSeek、浏览器登录状态
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { logger } from '../logger/logger';

/**
 * AI 客户端类型
 */
export type AIClientType = 'douyin-ai' | 'deepseek' | 'browser-gpt' | 'browser-deepseek' | 'browser-douyin' | 'none';

/**
 * AI 客户端信息
 */
export interface AIClientInfo {
  type: AIClientType;
  name: string;
  description: string;
  isAvailable: boolean;
  installPath?: string;
  isLoggedIn?: boolean;
  lastUsed?: number;
}

/**
 * AI 检测器类
 */
export class AIDetector {
  /**
   * 检测所有可用的 AI 客户端
   */
  public async detectAvailableAIClients(): Promise<AIClientInfo[]> {
    const clients: AIClientInfo[] = [];

    logger.info('AIDetector', '开始检测可用的 AI 客户端...');

    // 检测桌面客户端
    const desktopClients = await this.detectDesktopClients();
    clients.push(...desktopClients);

    // 检测浏览器登录状态
    const browserClients = await this.detectBrowserClients();
    clients.push(...browserClients);

    logger.info('AIDetector', `检测完成，发现 ${clients.length} 个可用 AI 客户端`);

    return clients;
  }

  /**
   * 检测桌面客户端
   */
  private async detectDesktopClients(): Promise<AIClientInfo[]> {
    const clients: AIClientInfo[] = [];
    const platform = os.platform();

    try {
      // 检测豆包客户端
      const douyinAI = await this.detectDouyinAI(platform);
      if (douyinAI) {
        clients.push(douyinAI);
      }

      // 检测 DeepSeek 客户端
      const deepseek = await this.detectDeepSeek(platform);
      if (deepseek) {
        clients.push(deepseek);
      }
    } catch (error) {
      logger.warn('AIDetector', '检测桌面客户端时出错', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return clients;
  }

  /**
   * 检测豆包客户端
   */
  private async detectDouyinAI(platform: string): Promise<AIClientInfo | null> {
    try {
      let installPath: string | undefined;
      let isLoggedIn = false;

      if (platform === 'darwin') {
        // macOS
        const macPath = path.join(os.homedir(), 'Applications/Douyin.app');
        if (fs.existsSync(macPath)) {
          installPath = macPath;
          isLoggedIn = await this.checkDouyinLoginStatus();
        }
      } else if (platform === 'win32') {
        // Windows
        const winPaths = [
          path.join(os.homedir(), 'AppData/Local/Programs/Douyin'),
          'C:\\Program Files\\Douyin',
          'C:\\Program Files (x86)\\Douyin',
        ];

        for (const p of winPaths) {
          if (fs.existsSync(p)) {
            installPath = p;
            isLoggedIn = await this.checkDouyinLoginStatus();
            break;
          }
        }
      }

      if (installPath) {
        return {
          type: 'douyin-ai',
          name: '豆包 AI',
          description: '字节跳动豆包 AI 助手',
          isAvailable: true,
          installPath,
          isLoggedIn,
          lastUsed: Date.now(),
        };
      }
    } catch (error) {
      logger.debug('AIDetector', '检测豆包客户端失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return null;
  }

  /**
   * 检测 DeepSeek 客户端
   */
  private async detectDeepSeek(platform: string): Promise<AIClientInfo | null> {
    try {
      let installPath: string | undefined;
      let isLoggedIn = false;

      if (platform === 'darwin') {
        // macOS
        const macPath = path.join(os.homedir(), 'Applications/DeepSeek.app');
        if (fs.existsSync(macPath)) {
          installPath = macPath;
          isLoggedIn = await this.checkDeepSeekLoginStatus();
        }
      } else if (platform === 'win32') {
        // Windows
        const winPaths = [
          path.join(os.homedir(), 'AppData/Local/Programs/DeepSeek'),
          'C:\\Program Files\\DeepSeek',
          'C:\\Program Files (x86)\\DeepSeek',
        ];

        for (const p of winPaths) {
          if (fs.existsSync(p)) {
            installPath = p;
            isLoggedIn = await this.checkDeepSeekLoginStatus();
            break;
          }
        }
      }

      if (installPath) {
        return {
          type: 'deepseek',
          name: 'DeepSeek',
          description: 'DeepSeek AI 助手',
          isAvailable: true,
          installPath,
          isLoggedIn,
          lastUsed: Date.now(),
        };
      }
    } catch (error) {
      logger.debug('AIDetector', '检测 DeepSeek 客户端失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return null;
  }

  /**
   * 检测浏览器登录状态
   */
  private async detectBrowserClients(): Promise<AIClientInfo[]> {
    const clients: AIClientInfo[] = [];

    try {
      // 检测 Chrome/Edge 浏览器中的 AI 登录状态
      const browserAIClients = await this.detectBrowserAILogins();
      clients.push(...browserAIClients);
    } catch (error) {
      logger.debug('AIDetector', '检测浏览器 AI 登录状态失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return clients;
  }

  /**
   * 检测浏览器中的 AI 登录状态
   */
  private async detectBrowserAILogins(): Promise<AIClientInfo[]> {
    const clients: AIClientInfo[] = [];
    const platform = os.platform();

    try {
      // 检查常见浏览器的 Cookie 和本地存储
      const browserDataPaths = this.getBrowserDataPaths(platform);

      for (const browserPath of browserDataPaths) {
        if (fs.existsSync(browserPath)) {
          // 检测 ChatGPT 登录
          if (await this.checkBrowserLogin(browserPath, 'chatgpt')) {
            clients.push({
              type: 'browser-gpt',
              name: 'ChatGPT (浏览器)',
              description: '通过浏览器访问的 ChatGPT',
              isAvailable: true,
              isLoggedIn: true,
              lastUsed: Date.now(),
            });
          }

          // 检测 DeepSeek 登录
          if (await this.checkBrowserLogin(browserPath, 'deepseek')) {
            clients.push({
              type: 'browser-deepseek',
              name: 'DeepSeek (浏览器)',
              description: '通过浏览器访问的 DeepSeek',
              isAvailable: true,
              isLoggedIn: true,
              lastUsed: Date.now(),
            });
          }

          // 检测豆包登录
          if (await this.checkBrowserLogin(browserPath, 'douyin')) {
            clients.push({
              type: 'browser-douyin',
              name: '豆包 (浏览器)',
              description: '通过浏览器访问的豆包 AI',
              isAvailable: true,
              isLoggedIn: true,
              lastUsed: Date.now(),
            });
          }
        }
      }
    } catch (error) {
      logger.debug('AIDetector', '检测浏览器登录状态失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return clients;
  }

  /**
   * 获取浏览器数据路径
   */
  private getBrowserDataPaths(platform: string): string[] {
    const paths: string[] = [];
    const homeDir = os.homedir();

    if (platform === 'darwin') {
      // macOS
      paths.push(path.join(homeDir, 'Library/Application Support/Google/Chrome'));
      paths.push(path.join(homeDir, 'Library/Application Support/Microsoft Edge'));
      paths.push(path.join(homeDir, 'Library/Application Support/Firefox'));
    } else if (platform === 'win32') {
      // Windows
      paths.push(path.join(homeDir, 'AppData/Local/Google/Chrome/User Data'));
      paths.push(path.join(homeDir, 'AppData/Local/Microsoft/Edge/User Data'));
      paths.push(path.join(homeDir, 'AppData/Roaming/Mozilla/Firefox'));
    } else if (platform === 'linux') {
      // Linux
      paths.push(path.join(homeDir, '.config/google-chrome'));
      paths.push(path.join(homeDir, '.config/microsoft-edge'));
      paths.push(path.join(homeDir, '.mozilla/firefox'));
    }

    return paths;
  }

  /**
   * 检查浏览器登录状态
   */
  private async checkBrowserLogin(browserPath: string, service: string): Promise<boolean> {
    try {
      // 简单的启发式检查：查找相关的 Cookie 或本地存储文件
      const cookiePath = path.join(browserPath, 'Default/Cookies');
      const localStoragePath = path.join(browserPath, 'Default/Local Storage');

      if (fs.existsSync(cookiePath) || fs.existsSync(localStoragePath)) {
        // 这是一个简化的检查，实际应用中需要更复杂的逻辑
        return true;
      }
    } catch (error) {
      logger.debug('AIDetector', `检查 ${service} 登录状态失败`, {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return false;
  }

  /**
   * 检查豆包登录状态
   */
  private async checkDouyinLoginStatus(): Promise<boolean> {
    try {
      // 检查豆包的配置文件或缓存
      const configPath = path.join(os.homedir(), '.douyin/config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config.isLoggedIn === true;
      }
    } catch (error) {
      logger.debug('AIDetector', '检查豆包登录状态失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return false;
  }

  /**
   * 检查 DeepSeek 登录状态
   */
  private async checkDeepSeekLoginStatus(): Promise<boolean> {
    try {
      // 检查 DeepSeek 的配置文件或缓存
      const configPath = path.join(os.homedir(), '.deepseek/config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config.isLoggedIn === true;
      }
    } catch (error) {
      logger.debug('AIDetector', '检查 DeepSeek 登录状态失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return false;
  }

  /**
   * 启动 AI 客户端
   */
  public async launchAIClient(clientType: AIClientType): Promise<boolean> {
    try {
      const platform = os.platform();

      if (clientType === 'douyin-ai') {
        if (platform === 'darwin') {
          execSync('open -a Douyin');
        } else if (platform === 'win32') {
          execSync('start Douyin');
        }
        return true;
      } else if (clientType === 'deepseek') {
        if (platform === 'darwin') {
          execSync('open -a DeepSeek');
        } else if (platform === 'win32') {
          execSync('start DeepSeek');
        }
        return true;
      }

      return false;
    } catch (error) {
      logger.error('AIDetector', '启动 AI 客户端失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return false;
    }
  }

  /**
   * 打开浏览器 AI 页面
   */
  public async openBrowserAI(clientType: AIClientType): Promise<boolean> {
    try {
      const platform = os.platform();
      let url = '';

      if (clientType === 'browser-gpt') {
        url = 'https://chat.openai.com';
      } else if (clientType === 'browser-deepseek') {
        url = 'https://chat.deepseek.com';
      } else if (clientType === 'browser-douyin') {
        url = 'https://www.doubao.com';
      }

      if (url) {
        if (platform === 'darwin') {
          execSync(`open "${url}"`);
        } else if (platform === 'win32') {
          execSync(`start "${url}"`);
        } else if (platform === 'linux') {
          execSync(`xdg-open "${url}"`);
        }
        return true;
      }

      return false;
    } catch (error) {
      logger.error('AIDetector', '打开浏览器 AI 页面失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return false;
    }
  }
}

// 导出单例
export const aiDetector = new AIDetector();
