/**
 * AI 集成 API 封装
 * 前端通过此模块调用后端 AI 集成服务
 */

import { ipcClient } from '../utils/ipc-client';
import type {
  AIParseRequest,
  AIParseResponse,
  AIClientInfo,
  AIIntegrationConfig,
  DemandAnalysis,
} from '../types';

/**
 * AI 集成 API 客户端
 */
export const aiIntegrationAPI = {
  /**
   * 初始化 AI 集成服务
   * @returns 初始化结果
   */
  async initialize(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await ipcClient.invoke('ai:initialize');
      const result = (response as { success: boolean; message?: string }) || { success: false };
      return result;
    } catch (error) {
      console.error('[AI API] 初始化失败:', error);
      return { success: false, message: String(error) };
    }
  },

  /**
   * 检测系统中可用的 AI 客户端
   * @returns 可用的 AI 客户端列表
   */
  async detectClients(): Promise<AIClientInfo[]> {
    try {
      const response = await ipcClient.invoke('ai:detect-clients');
      return ((response as { clients?: AIClientInfo[] }).clients) || [];
    } catch (error) {
      console.error('[AI API] 检测客户端失败:', error);
      return [];
    }
  },

  /**
   * 获取已检测到的 AI 客户端列表
   * @returns 客户端列表
   */
  async getClients(): Promise<AIClientInfo[]> {
    try {
      const response = await ipcClient.invoke('ai:get-clients');
      return ((response as { clients?: AIClientInfo[] }).clients) || [];
    } catch (error) {
      console.error('[AI API] 获取客户端列表失败:', error);
      return [];
    }
  },

  /**
   * 解析用户需求
   * @param request 解析请求
   * @returns 解析结果
   */
  async parseRequirement(request: AIParseRequest): Promise<AIParseResponse> {
    try {
      const response = await ipcClient.invoke('ai:parse-requirement', request);
      return response as AIParseResponse;
    } catch (error) {
      console.error('[AI API] 解析需求失败:', error);
      return {
        success: false,
        analysis: {
          id: '',
          timestamp: Date.now(),
          rawInput: '',
          detectedLanguages: [],
          detectedVersions: [],
          requiredDependencies: [],
          suggestedScenario: 'unknown',
          confidence: 0,
          recommendations: [],
        },
        mode: 'offline',
        confidence: 0,
      };
    }
  },

  /**
   * 分析错误日志
   * @param errorLog 错误日志内容
   * @returns 分析结果
   */
  async analyzeError(errorLog: string): Promise<AIParseResponse> {
    try {
      const response = await ipcClient.invoke('ai:analyze-error', {
        errorLog,
      });
      return response as AIParseResponse;
    } catch (error) {
      console.error('[AI API] 分析错误失败:', error);
      return {
        success: false,
        analysis: {
          id: '',
          timestamp: Date.now(),
          rawInput: '',
          detectedLanguages: [],
          detectedVersions: [],
          requiredDependencies: [],
          suggestedScenario: 'unknown',
          confidence: 0,
          recommendations: [],
        },
        mode: 'offline',
        confidence: 0,
      };
    }
  },

  /**
   * 识别配置文件
   * @param filename 文件名
   * @param content 文件内容
   * @returns 识别结果
   */
  async identifyConfig(
    filename: string,
    content: string
  ): Promise<AIParseResponse> {
    try {
      const response = await ipcClient.invoke('ai:identify-config', {
        filename,
        content,
      });
      return response as AIParseResponse;
    } catch (error) {
      console.error('[AI API] 识别配置失败:', error);
      return {
        success: false,
        analysis: {
          id: '',
          timestamp: Date.now(),
          rawInput: '',
          detectedLanguages: [],
          detectedVersions: [],
          requiredDependencies: [],
          suggestedScenario: 'unknown',
          confidence: 0,
          recommendations: [],
        },
        mode: 'offline',
        confidence: 0,
      };
    }
  },

  /**
   * 获取 AI 集成服务状态
   * @returns 服务状态
   */
  async getStatus(): Promise<{
    initialized: boolean;
    mode: string;
    desktopClientsAvailable: boolean;
    browserClientsAvailable: boolean;
    userConsent: boolean;
  }> {
    try {
      const response = await ipcClient.invoke('ai:get-status');
      return response as {
        initialized: boolean;
        mode: string;
        desktopClientsAvailable: boolean;
        browserClientsAvailable: boolean;
        userConsent: boolean;
      };
    } catch (error) {
      console.error('[AI API] 获取状态失败:', error);
      return {
        initialized: false,
        mode: 'offline',
        desktopClientsAvailable: false,
        browserClientsAvailable: false,
        userConsent: false,
      };
    }
  },

  /**
   * 请求用户授权
   * @returns 授权对话框结果
   */
  async requestConsent(): Promise<{
    granted: boolean;
    mode: 'all' | 'offline-only' | 'none';
  }> {
    try {
      const response = await ipcClient.invoke('ai:request-consent');
      return response as {
        granted: boolean;
        mode: 'all' | 'offline-only' | 'none';
      };
    } catch (error) {
      console.error('[AI API] 请求授权失败:', error);
      return { granted: false, mode: 'none' };
    }
  },

  /**
   * 处理用户授权响应
   * @param response 用户选择
   * @returns 处理结果
   */
  async handleConsent(response: 'allow' | 'offline-only' | 'deny'): Promise<{
    success: boolean;
  }> {
    try {
      const result = await ipcClient.invoke('ai:handle-consent', { response });
      return result as { success: boolean };
    } catch (error) {
      console.error('[AI API] 处理授权失败:', error);
      return { success: false };
    }
  },

  /**
   * 设置 AI 集成配置
   * @param config 配置对象
   * @returns 设置结果
   */
  async setConfig(config: Partial<AIIntegrationConfig>): Promise<{
    success: boolean;
  }> {
    try {
      const response = await ipcClient.invoke('ai:set-config', { config });
      return response as { success: boolean };
    } catch (error) {
      console.error('[AI API] 设置配置失败:', error);
      return { success: false };
    }
  },

  /**
   * 获取 AI 集成配置
   * @returns 配置对象
   */
  async getConfig(): Promise<AIIntegrationConfig | null> {
    try {
      const response = await ipcClient.invoke('ai:get-config');
      return (response as { config?: AIIntegrationConfig }).config || null;
    } catch (error) {
      console.error('[AI API] 获取配置失败:', error);
      return null;
    }
  },
};

/**
 * 便捷函数：快速解析需求文本
 * @param text 需求文本
 * @returns 解析结果
 */
export async function parseRequirementText(text: string): Promise<DemandAnalysis> {
  const response = await aiIntegrationAPI.parseRequirement({
    type: 'requirement',
    content: text,
  });

  if (response.success) {
    return response.analysis;
  }

  return {
    id: '',
    timestamp: Date.now(),
    rawInput: text,
    detectedLanguages: [],
    detectedVersions: [],
    requiredDependencies: [],
    suggestedScenario: 'unknown',
    confidence: 0,
    recommendations: [],
  };
}

/**
 * 便捷函数：快速分析错误
 * @param errorLog 错误日志
 * @returns 分析结果
 */
export async function analyzeErrorLog(errorLog: string): Promise<DemandAnalysis> {
  const response = await aiIntegrationAPI.analyzeError(errorLog);

  if (response.success) {
    return response.analysis;
  }

  return {
    id: '',
    timestamp: Date.now(),
    rawInput: errorLog,
    detectedLanguages: [],
    detectedVersions: [],
    requiredDependencies: [],
    suggestedScenario: 'unknown',
    confidence: 0,
    recommendations: [],
  };
}

/**
 * 便捷函数：快速识别配置文件
 * @param filename 文件名
 * @param content 文件内容
 * @returns 分析结果
 */
export async function identifyConfigFile(
  filename: string,
  content: string
): Promise<DemandAnalysis> {
  const response = await aiIntegrationAPI.identifyConfig(filename, content);

  if (response.success) {
    return response.analysis;
  }

  return {
    id: '',
    timestamp: Date.now(),
    rawInput: content,
    detectedLanguages: [],
    detectedVersions: [],
    requiredDependencies: [],
    suggestedScenario: 'unknown',
    confidence: 0,
    recommendations: [],
  };
}
