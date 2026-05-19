/**
 * AI 集成 IPC 处理程序
 * 处理前端与后端的 AI 集成通信
 */

import { ipcMain } from 'electron';
import { aiIntegrationService, type AIParseRequest, type AIParseResponse } from '../../service/ai-integration/ai-integration';
import { logger } from '../../service/logger/logger';
import type { IPCRequest, IPCResponse } from '../../src/types/ipc';

/**
 * 注册 AI 集成 IPC 处理程序
 */
export function registerAIIntegrationHandlers(): void {
  logger.info('AIIntegrationHandler', '注册 AI 集成 IPC 处理程序...');

  /**
   * 初始化 AI 集成服务
   */
  ipcMain.handle('ai:initialize', async (event, request: IPCRequest) => {
    try {
      logger.info('AIIntegrationHandler', '初始化 AI 集成服务');

      await aiIntegrationService.initialize();

      const response: IPCResponse = {
        id: request.id || `ai-init-${Date.now()}`,
        success: true,
        data: {
          message: 'AI 集成服务初始化完成',
          status: aiIntegrationService.getStatus(),
        },
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '初始化失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        id: request.id || `ai-init-error-${Date.now()}`,
        success: false,
        error: {
          code: 'AI_INIT_ERROR',
          message: error instanceof Error ? error.message : '初始化失败',
        },
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 检测可用的 AI 客户端
   */
  ipcMain.handle('ai:detect-clients', async (event, request: IPCRequest) => {
    try {
      logger.info('AIIntegrationHandler', '检测可用的 AI 客户端');

      const clients = await aiIntegrationService.detectAvailableClients();

      const response: IPCResponse = {
        id: request.id || `ai-detect-${Date.now()}`,
        success: true,
        data: {
          clients,
          count: clients.length,
        },
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '检测失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '检测失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 获取可用的 AI 客户端列表
   */
  ipcMain.handle('ai:get-clients', async (event, request: IPCRequest) => {
    try {
      const clients = aiIntegrationService.getAvailableClients();

      const response: IPCResponse = {
        id: request.id || `ai-get-clients-${Date.now()}`,
        success: true,
        data: {
          clients,
          count: clients.length,
        },
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '获取客户端列表失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 解析用户需求
   */
  ipcMain.handle('ai:parse-requirement', async (event, request: IPCRequest) => {
    try {
      const parseRequest = (request.data || {}) as AIParseRequest;

      logger.info('AIIntegrationHandler', '解析用户需求', {
        type: parseRequest.type,
      });

      const response = await aiIntegrationService.parseRequirement(parseRequest);

      const ipcResponse: IPCResponse = {
        id: request.id || `ai-parse-${Date.now()}`,
        success: response.success,
        data: response,
        timestamp: Date.now(),
      };

      return ipcResponse;
    } catch (error) {
      logger.error('AIIntegrationHandler', '解析失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '解析失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 分析错误日志
   */
  ipcMain.handle('ai:analyze-error', async (event, request: IPCRequest) => {
    try {
      const data = (request.data || {}) as Record<string, unknown>;
      const parseRequest: AIParseRequest = {
        type: 'error_log',
        content: (data.errorLog || '') as string,
      };

      logger.info('AIIntegrationHandler', '分析错误日志');

      const response = await aiIntegrationService.parseRequirement(parseRequest);

      const ipcResponse: IPCResponse = {
        id: request.id || `ai-analyze-${Date.now()}`,
        success: response.success,
        data: response,
        timestamp: Date.now(),
      };

      return ipcResponse;
    } catch (error) {
      logger.error('AIIntegrationHandler', '分析失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '分析失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 识别配置文件
   */
  ipcMain.handle('ai:identify-config', async (event, request: IPCRequest) => {
    try {
      const data = (request.data || {}) as Record<string, unknown>;
      const parseRequest: AIParseRequest = {
        type: 'config_file',
        content: (data.content || '') as string,
        filename: (data.filename || 'config') as string,
      };

      logger.info('AIIntegrationHandler', '识别配置文件', {
        filename: data.filename,
      });

      const response = await aiIntegrationService.parseRequirement(parseRequest);

      const ipcResponse: IPCResponse = {
        id: request.id || `ai-identify-${Date.now()}`,
        success: response.success,
        data: response,
        timestamp: Date.now(),
      };

      return ipcResponse;
    } catch (error) {
      logger.error('AIIntegrationHandler', '识别失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '识别失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 获取 AI 集成状态
   */
  ipcMain.handle('ai:get-status', async (event, request: IPCRequest) => {
    try {
      const status = aiIntegrationService.getStatus();

      const response: IPCResponse = {
        id: request.id || `ai-status-${Date.now()}`,
        success: true,
        data: status,
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '获取状态失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 请求用户授权
   */
  ipcMain.handle('ai:request-consent', async (event, request: IPCRequest) => {
    try {
      const consentRequest = aiIntegrationService.requestUserConsent();

      const response: IPCResponse = {
        id: request.id || `ai-consent-${Date.now()}`,
        success: true,
        data: consentRequest,
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '请求授权失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 处理用户授权响应
   */
  ipcMain.handle('ai:handle-consent', async (event, request: IPCRequest) => {
    try {
      const data = (request.data || {}) as Record<string, unknown>;
      const action = (data.action || '') as string;

      logger.info('AIIntegrationHandler', '处理用户授权', { action });

      aiIntegrationService.handleUserConsentResponse(action);

      const response: IPCResponse = {
        id: request.id || `ai-handle-consent-${Date.now()}`,
        success: true,
        data: {
          message: '授权已处理',
          status: aiIntegrationService.getStatus(),
        },
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '处理授权失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 设置 AI 集成配置
   */
  ipcMain.handle('ai:set-config', async (event, request: IPCRequest) => {
    try {
      const config = (request.data || {}) as Record<string, unknown>;

      logger.info('AIIntegrationHandler', '设置 AI 集成配置', { config });

      aiIntegrationService.setConfig(config);

      const response: IPCResponse = {
        id: request.id || `ai-set-config-${Date.now()}`,
        success: true,
        data: {
          message: '配置已更新',
          config: aiIntegrationService.getConfig(),
        },
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '设置配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '设置失败',
        timestamp: Date.now(),
      };
    }
  });

  /**
   * 获取 AI 集成配置
   */
  ipcMain.handle('ai:get-config', async (event, request: IPCRequest) => {
    try {
      const config = aiIntegrationService.getConfig();

      const response: IPCResponse = {
        id: request.id || `ai-get-config-${Date.now()}`,
        success: true,
        data: config,
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      logger.error('AIIntegrationHandler', '获取配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
        timestamp: Date.now(),
      };
    }
  });

  logger.info('AIIntegrationHandler', 'AI 集成 IPC 处理程序注册完成');
}
