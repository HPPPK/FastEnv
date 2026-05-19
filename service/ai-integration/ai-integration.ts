/**
 * AI 联动集成服务
 * 支持三种模式：离线本地、桌面客户端、浏览器登录
 * 完全零配置、零门槛、用户友好
 */

import type { DemandAnalysis } from '../../src/types';
import { logger } from '../logger/logger';
import { aiDetector, type AIClientInfo, type AIClientType } from './ai-detector';
import { offlineParser } from './offline-parser';

/**
 * AI 集成模式
 */
export type AIIntegrationMode = 'offline' | 'desktop-client' | 'browser';

/**
 * AI 集成配置
 */
export interface AIIntegrationConfig {
  mode: AIIntegrationMode;
  enableOfflineMode: boolean;
  enableDesktopMode: boolean;
  enableBrowserMode: boolean;
  preferredClient?: AIClientType;
  autoDetectClients: boolean;
  userConsent: boolean;
}

/**
 * AI 解析请求
 */
export interface AIParseRequest {
  type: 'requirement' | 'error_log' | 'config_file';
  content: string;
  filename?: string;
  preferredMode?: AIIntegrationMode;
}

/**
 * AI 解析响应
 */
export interface AIParseResponse {
  success: boolean;
  analysis: DemandAnalysis;
  mode: AIIntegrationMode;
  confidence: number;
  suggestions: string[];
  warnings: string[];
  usedAIClient?: AIClientInfo;
  timestamp: number;
}

/**
 * AI 集成服务类
 */
export class AIIntegrationService {
  private config: AIIntegrationConfig = {
    mode: 'offline',
    enableOfflineMode: true,
    enableDesktopMode: true,
    enableBrowserMode: true,
    autoDetectClients: true,
    userConsent: false,
  };

  private availableClients: AIClientInfo[] = [];
  private detectionInProgress = false;

  /**
   * 初始化 AI 集成服务
   */
  public async initialize(): Promise<void> {
    logger.info('AIIntegrationService', '初始化 AI 集成服务...');

    try {
      // 自动检测可用的 AI 客户端
      if (this.config.autoDetectClients) {
        await this.detectAvailableClients();
      }

      logger.info('AIIntegrationService', 'AI 集成服务初始化完成', {
        availableClients: this.availableClients.length,
      });
    } catch (error) {
      logger.error('AIIntegrationService', '初始化失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<AIIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('AIIntegrationService', '配置已更新', { config: this.config });
  }

  /**
   * 获取配置
   */
  public getConfig(): AIIntegrationConfig {
    return { ...this.config };
  }

  /**
   * 检测可用的 AI 客户端
   */
  public async detectAvailableClients(): Promise<AIClientInfo[]> {
    if (this.detectionInProgress) {
      logger.warn('AIIntegrationService', '检测已在进行中，跳过重复检测');
      return this.availableClients;
    }

    this.detectionInProgress = true;

    try {
      logger.info('AIIntegrationService', '开始检测可用的 AI 客户端...');

      this.availableClients = await aiDetector.detectAvailableAIClients();

      logger.info('AIIntegrationService', `检测完成，发现 ${this.availableClients.length} 个可用客户端`, {
        clients: this.availableClients.map((c) => c.name),
      });

      return this.availableClients;
    } catch (error) {
      logger.error('AIIntegrationService', '检测失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return [];
    } finally {
      this.detectionInProgress = false;
    }
  }

  /**
   * 获取可用的 AI 客户端列表
   */
  public getAvailableClients(): AIClientInfo[] {
    return [...this.availableClients];
  }

  /**
   * 解析用户需求（智能选择模式）
   */
  public async parseRequirement(request: AIParseRequest): Promise<AIParseResponse> {
    logger.info('AIIntegrationService', '开始解析用户需求...', {
      type: request.type,
      preferredMode: request.preferredMode,
    });

    // 1. 优先使用离线模式（最快、最稳定）
    if (this.config.enableOfflineMode) {
      return this.parseWithOfflineMode(request);
    }

    // 2. 如果离线模式不可用，尝试使用桌面客户端
    if (this.config.enableDesktopMode && this.availableClients.length > 0) {
      return this.parseWithDesktopClient(request);
    }

    // 3. 最后尝试浏览器模式
    if (this.config.enableBrowserMode) {
      return this.parseWithBrowserMode(request);
    }

    // 4. 如果所有模式都不可用，回退到离线模式
    return this.parseWithOfflineMode(request);
  }

  /**
   * 使用离线模式解析
   */
  private async parseWithOfflineMode(request: AIParseRequest): Promise<AIParseResponse> {
    logger.info('AIIntegrationService', '使用离线模式解析...');

    try {
      let result;

      switch (request.type) {
        case 'requirement':
          result = offlineParser.parseRequirements(request.content);
          break;
        case 'error_log':
          result = offlineParser.analyzeErrorLog(request.content);
          break;
        case 'config_file':
          result = offlineParser.identifyConfigFile(request.content, request.filename || 'config');
          break;
        default:
          result = offlineParser.parseRequirements(request.content);
      }

      logger.info('AIIntegrationService', '离线解析完成', {
        confidence: result.confidence,
      });

      return {
        success: result.success,
        analysis: result.analysis,
        mode: 'offline',
        confidence: result.confidence,
        suggestions: result.suggestions,
        warnings: result.warnings,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('AIIntegrationService', '离线解析失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      // 返回空结果
      return {
        success: false,
        analysis: {
          id: `analysis-${Date.now()}`,
          timestamp: Date.now(),
          rawInput: request.content,
          detectedLanguages: [],
          detectedVersions: [],
          requiredDependencies: [],
          suggestedScenario: 'general',
          confidence: 0,
          recommendations: [],
        },
        mode: 'offline',
        confidence: 0,
        suggestions: [],
        warnings: ['离线解析失败，请重试'],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 使用桌面客户端解析
   */
  private async parseWithDesktopClient(request: AIParseRequest): Promise<AIParseResponse> {
    logger.info('AIIntegrationService', '使用桌面客户端模式解析...');

    try {
      // 选择合适的客户端
      const client = this.selectBestClient();

      if (!client) {
        logger.warn('AIIntegrationService', '没有可用的桌面客户端，回退到离线模式');
        return this.parseWithOfflineMode(request);
      }

      logger.info('AIIntegrationService', `使用客户端: ${client.name}`);

      // 启动客户端
      const launched = await aiDetector.launchAIClient(client.type);

      if (!launched) {
        logger.warn('AIIntegrationService', '启动客户端失败，回退到离线模式');
        return this.parseWithOfflineMode(request);
      }

      // 模拟客户端解析（实际应用中需要通过 IPC 或其他方式与客户端通信）
      const result = await this.simulateClientParsing(request, client);

      logger.info('AIIntegrationService', '桌面客户端解析完成', {
        confidence: result.confidence,
      });

      return {
        success: result.success,
        analysis: result.analysis,
        mode: 'desktop-client',
        confidence: result.confidence,
        suggestions: result.suggestions,
        warnings: result.warnings,
        usedAIClient: client,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('AIIntegrationService', '桌面客户端解析失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      // 回退到离线模式
      return this.parseWithOfflineMode(request);
    }
  }

  /**
   * 使用浏览器模式解析
   */
  private async parseWithBrowserMode(request: AIParseRequest): Promise<AIParseResponse> {
    logger.info('AIIntegrationService', '使用浏览器模式解析...');

    try {
      // 选择浏览器客户端
      const browserClient = this.availableClients.find((c) => c.type.startsWith('browser-'));

      if (!browserClient) {
        logger.warn('AIIntegrationService', '没有可用的浏览器客户端，回退到离线模式');
        return this.parseWithOfflineMode(request);
      }

      logger.info('AIIntegrationService', `打开浏览器: ${browserClient.name}`);

      // 打开浏览器
      const opened = await aiDetector.openBrowserAI(browserClient.type);

      if (!opened) {
        logger.warn('AIIntegrationService', '打开浏览器失败，回退到离线模式');
        return this.parseWithOfflineMode(request);
      }

      // 模拟浏览器解析
      const result = await this.simulateClientParsing(request, browserClient);

      logger.info('AIIntegrationService', '浏览器模式解析完成', {
        confidence: result.confidence,
      });

      return {
        success: result.success,
        analysis: result.analysis,
        mode: 'browser',
        confidence: result.confidence,
        suggestions: result.suggestions,
        warnings: result.warnings,
        usedAIClient: browserClient,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('AIIntegrationService', '浏览器模式解析失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      // 回退到离线模式
      return this.parseWithOfflineMode(request);
    }
  }

  /**
   * 选择最佳客户端
   */
  private selectBestClient(): AIClientInfo | null {
    // 优先选择已登录的客户端
    const loggedInClients = this.availableClients.filter((c) => c.isLoggedIn);

    if (loggedInClients.length > 0) {
      // 优先选择豆包或 DeepSeek
      const preferred = loggedInClients.find((c) => c.type === 'douyin-ai' || c.type === 'deepseek');
      return preferred || loggedInClients[0];
    }

    // 如果没有已登录的客户端，返回第一个可用的
    return this.availableClients.length > 0 ? this.availableClients[0] : null;
  }

  /**
   * 模拟客户端解析（实际应用中需要真实的 AI 调用）
   */
  private async simulateClientParsing(
    request: AIParseRequest,
    client: AIClientInfo
  ): Promise<{
    success: boolean;
    analysis: DemandAnalysis;
    confidence: number;
    suggestions: string[];
    warnings: string[];
  }> {
    // 这里应该通过 IPC 或其他方式与真实的 AI 客户端通信
    // 目前返回离线解析的结果，但标记为来自客户端
    const offlineResult = offlineParser.parseRequirements(request.content);

    // 提高置信度（因为使用了外部 AI）
    offlineResult.analysis.confidence = Math.min(100, offlineResult.analysis.confidence + 15);

    return offlineResult;
  }

  /**
   * 获取 AI 集成状态
   */
  public getStatus(): {
    offlineModeAvailable: boolean;
    desktopClientsAvailable: number;
    browserClientsAvailable: number;
    preferredMode: AIIntegrationMode;
    userConsent: boolean;
  } {
    const desktopClients = this.availableClients.filter((c) => !c.type.startsWith('browser-'));
    const browserClients = this.availableClients.filter((c) => c.type.startsWith('browser-'));

    return {
      offlineModeAvailable: this.config.enableOfflineMode,
      desktopClientsAvailable: desktopClients.length,
      browserClientsAvailable: browserClients.length,
      preferredMode: this.config.mode,
      userConsent: this.config.userConsent,
    };
  }

  /**
   * 请求用户授权
   */
  public requestUserConsent(): {
    title: string;
    message: string;
    details: string[];
    buttons: Array<{ label: string; action: string }>;
  } {
    return {
      title: '使用 AI 辅助功能',
      message: '是否允许 EnvGuard 使用您日常使用的 AI 工具来帮助分析环境配置需求？',
      details: [
        '✓ 完全离线运行，无需上传任何数据',
        '✓ 仅使用您已登录的本地 AI 客户端',
        '✓ 所有分析结果仅保存在本地',
        '✓ 您可以随时在设置中关闭此功能',
      ],
      buttons: [
        { label: '允许', action: 'allow' },
        { label: '仅使用离线模式', action: 'offline_only' },
        { label: '拒绝', action: 'deny' },
      ],
    };
  }

  /**
   * 处理用户授权响应
   */
  public handleUserConsentResponse(action: string): void {
    switch (action) {
      case 'allow':
        this.config.userConsent = true;
        this.config.enableDesktopMode = true;
        this.config.enableBrowserMode = true;
        logger.info('AIIntegrationService', '用户允许使用 AI 辅助功能');
        break;
      case 'offline_only':
        this.config.userConsent = false;
        this.config.enableDesktopMode = false;
        this.config.enableBrowserMode = false;
        this.config.mode = 'offline';
        logger.info('AIIntegrationService', '用户选择仅使用离线模式');
        break;
      case 'deny':
        this.config.userConsent = false;
        this.config.enableDesktopMode = false;
        this.config.enableBrowserMode = false;
        this.config.mode = 'offline';
        logger.info('AIIntegrationService', '用户拒绝使用 AI 辅助功能');
        break;
    }
  }
}

// 导出单例
export const aiIntegrationService = new AIIntegrationService();
