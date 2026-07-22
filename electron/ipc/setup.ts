/**
 * IPC 通信设置
 * 配置主进程与渲染进程的通信处理
 */

import { app, BrowserWindow, dialog, ipcMain, WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { IPCRequest, IPCResponse } from '../../src/types/ipc';
import { logger } from '../../service/logger/logger';
import { systemScanner } from '../../service/env-scan/system-scanner';
import { demandParser } from '../../service/demand-parse/parser';
import { conflictDetector } from '../../service/env-conflict/detector';
import { conflictRepairer } from '../../service/env-conflict/repairer';
import { getEnvironmentPermissionStatus } from '../../service/env-conflict/permissions';
import {
  requestEnvironmentElevation,
  writeSystemPathWithElevation,
} from '../../service/env-conflict/elevation';
import { environmentCreator } from '../../service/env-create/creator';
import { persistenceManager } from '../../service/storage/persistence';
import { registerAIIntegrationHandlers } from './ai-integration-handler';
import EnvironmentCreator from '../../service/env-create/env-creator';
import EnvironmentInstaller, {
  type InstallProgress,
} from '../../service/env-install/env-installer';
import { ConflictDetector } from '../../service/env-conflict/conflict-detector';
import { ConflictFixer } from '../../service/env-conflict/conflict-fixer';
import { SystemFixer } from '../../service/system-fix/system-fixer';
import type { AppSettings, Dependency } from '../../src/types';
import type { Environment } from '../../src/types';
import type { ConflictIssue } from '../../service/env-conflict/conflict-detector';
import type { EnvironmentCreateProgress } from '../../service/env-create/creator';

// 初始化服务实例
const envCreator = new EnvironmentCreator();
const envInstaller = new EnvironmentInstaller();
const conflictDetectorService = new ConflictDetector();
const conflictFixerService = new ConflictFixer();
const systemFixerService = new SystemFixer();
let activeMainWindow: BrowserWindow | null = null;
const createControllers = new Map<string, AbortController>();

/**
 * 设置 IPC 通信处理
 */
export function setupIPC(mainWindow: BrowserWindow): void {
  activeMainWindow = mainWindow;
  /**
   * 处理来自渲染进程的 IPC 请求
   */
  ipcMain.on('ipc:request', async (event, request: IPCRequest) => {
    try {
      const { id, channel, data } = request;
      const responseData = await handleIPCRequest(channel, data, event.sender);
      const response: IPCResponse = {
        id,
        success: true,
        data: responseData,
        timestamp: Date.now(),
      };

      event.sender.send('ipc:response', response);
    } catch (error) {
      const response: IPCResponse = {
        id: request.id,
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      };

      event.sender.send('ipc:response', response);
    }
  });

  /**
   * 处理渲染进程的系统扫描请求
   */
  ipcMain.on('system:scan', async (event) => {
    try {
      const result = filterDeletedScanResult(await systemScanner.scan());
      const response: IPCResponse = {
        id: `system-scan-${Date.now()}`,
        success: true,
        data: result,
        timestamp: Date.now(),
      };

      event.sender.send('ipc:response', response);
    } catch (error) {
      const response: IPCResponse = {
        id: `system-scan-${Date.now()}`,
        success: false,
        error: {
          code: 'SYSTEM_SCAN_ERROR',
          message: error instanceof Error ? error.message : 'System scan failed',
        },
        timestamp: Date.now(),
      };

      event.sender.send('ipc:response', response);
    }
  });

  // 注册 AI 集成处理程序
  registerAIIntegrationHandlers();

  logger.info('IPC', 'Setup completed');
}

async function handleIPCRequest(
  channel: string,
  data: unknown,
  sender?: WebContents
): Promise<unknown> {
  switch (channel) {
    case 'system:scan':
      return filterDeletedScanResult(await systemScanner.scan());

    case 'system:permissions':
      return getEnvironmentPermissionStatus();

    case 'system:elevation-request':
      return requestEnvironmentElevation();

    case 'system:write-path-elevated': {
      const payload = data as { pathEntries?: unknown };
      if (
        !Array.isArray(payload?.pathEntries) ||
        payload.pathEntries.some((entry) => typeof entry !== 'string')
      ) {
        throw new Error('系统级 PATH 写入请求无效');
      }
      return writeSystemPathWithElevation(payload.pathEntries);
    }

    case 'env:list':
      return {
        environments: persistenceManager
          .loadEnvironments()
          .filter((environment) => !persistenceManager.isEnvironmentDeleted(environment)),
      };

    case 'env:create': {
      const payload = data as {
        name: string;
        type: string;
        version?: string;
        path?: string;
        tags?: string[];
        projectNote?: string;
        dependencies?: string[];
        operationId?: string;
      };
      const operationId = payload.operationId ?? `env-create-${Date.now()}`;
      const controller = new AbortController();
      createControllers.set(operationId, controller);
      const emitProgress = (progress: EnvironmentCreateProgress): void => {
        sender?.send('ipc:event', {
          channel: 'env:create:progress',
          data: progress,
          timestamp: Date.now(),
        });
      };

      let environment;
      try {
        environment = await environmentCreator.createEnvironment(
          payload.name,
          payload.type,
          payload.version ?? 'latest',
          payload.path,
          payload.dependencies ?? [],
          {
            operationId,
            signal: controller.signal,
            onProgress: emitProgress,
          }
        );
      } finally {
        createControllers.delete(operationId);
      }
      environment.dependencies = systemScanner.scanInstalledDependencies(
        environment.path,
        environment.type
      );
      environment.tags = payload.tags
        ? Array.from(new Set([...environment.tags, ...payload.tags]))
        : environment.tags;
      environment.projectNote = payload.projectNote ?? environment.projectNote;
      const environments = persistenceManager.loadEnvironments();
      persistenceManager.saveEnvironments([...environments, environment]);
      return { environment, setupLogs: [] };
    }

    case 'env:create-cancel': {
      const payload = data as { operationId: string };
      const controller = createControllers.get(payload.operationId);
      controller?.abort();
      const killed = environmentCreator.cancel(payload.operationId);
      createControllers.delete(payload.operationId);
      return { success: Boolean(controller) || killed };
    }

    case 'env:update': {
      const payload = data as {
        environmentId: string;
        updates: Partial<Environment>;
      };
      const environments = persistenceManager.loadEnvironments();
      const existing = environments.find((item) => item.id === payload.environmentId);

      if (!existing) {
        throw new Error('Environment not found');
      }

      const updated: Environment = {
        ...existing,
        ...payload.updates,
        id: existing.id,
        path: existing.path,
        type: existing.type,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      };

      persistenceManager.saveEnvironments(
        environments.map((item) => (item.id === updated.id ? updated : item))
      );
      return { environment: updated };
    }

    case 'env:delete': {
      const payload = data as {
        environmentId?: string;
        envId?: string;
        environment?: Environment;
        deleteData?: boolean;
      };
      const environmentId = payload.environmentId ?? payload.envId ?? payload.environment?.id;
      const environments = persistenceManager.loadEnvironments();
      const environment =
        environments.find((item) => item.id === environmentId) ?? payload.environment;

      if (!environment) {
        throw new Error('Environment not found');
      }

      const shouldDeleteData =
        payload.deleteData ??
        Boolean(
          environment.isVirtual ||
          environment.tags.includes('managed') ||
          environment.tags.includes('conda') ||
          environment.tags.includes('venv') ||
          environment.path.includes('/.envguard/envs/')
        );

      if (shouldDeleteData && !environment.tags.includes('system')) {
        await environmentCreator.deleteEnvironment(environment.path);
      }

      persistenceManager.markEnvironmentDeleted(environment);
      persistenceManager.saveEnvironments(
        environments.filter((item) => item.id !== environment.id && item.path !== environment.path)
      );
      return {
        success: true,
        deletedData: shouldDeleteData && !environment.tags.includes('system'),
      };
    }

    case 'demand:parse': {
      const payload = data as { type?: string; content?: string; rawContent?: string };
      const content = payload.rawContent ?? payload.content ?? '';
      if (payload.type === 'document') {
        return demandParser.parseDocument(content);
      }
      if (payload.type === 'image') {
        return demandParser.parseScreenshot(content);
      }
      return demandParser.parseText(content);
    }

    case 'conflict:detect': {
      const scanResult = await systemScanner.scan();
      const environments = persistenceManager.loadEnvironments();
      const conflicts = conflictDetector.detectConflicts(environments, scanResult);
      return {
        conflicts,
        summary: {
          total: conflicts.length,
          critical: conflicts.filter((item) => item.severity === 'critical').length,
          high: conflicts.filter((item) => item.severity === 'high').length,
          medium: conflicts.filter((item) => item.severity === 'medium').length,
          low: conflicts.filter((item) => item.severity === 'low').length,
        },
      };
    }

    case 'conflict:fix': {
      const scanResult = await systemScanner.scan();
      const environments = persistenceManager.loadEnvironments();
      const conflicts = conflictDetector.detectConflicts(environments, scanResult);
      const record = await conflictRepairer.repairConflicts(conflicts, 'system');
      const records = persistenceManager.loadRepairRecords();
      persistenceManager.saveRepairRecords([...records, record]);
      return { repairRecord: record, success: record.status === 'success' };
    }

    case 'repair-records:list':
      return { records: persistenceManager.loadRepairRecords() };

    case 'config:get':
      return { config: persistenceManager.loadSettings() };

    case 'config:set':
      return { success: persistenceManager.saveSettings(data as AppSettings) };

    case 'log:get':
      return { logs: [], total: 0 };

    // 新增：环境创建服务
    case 'env:create-new': {
      const payload = data as {
        name: string;
        type: 'python' | 'node' | 'java' | 'go';
        version?: string;
        basePath?: string;
        dependencies?: string[];
        mirrorSource?: string;
      };
      return envCreator.createEnvironment(payload);
    }

    // 新增：依赖安装服务
    case 'env:install-packages': {
      const payload = data as {
        environmentPath: string;
        environmentType: 'python' | 'node' | 'java' | 'go';
        packages: string[];
        mirrorSource?: string;
        operationId?: string;
      };
      const operationId =
        payload.operationId ??
        `dependency-install-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const emitProgress = (progress: InstallProgress): void => {
        sender?.send('ipc:event', {
          channel: 'dependency:install:progress',
          data: { ...progress, operationId },
          timestamp: Date.now(),
        });
      };
      return envInstaller.installPackages({ ...payload, onProgress: emitProgress });
    }

    // 新增：获取已安装包列表
    case 'env:get-installed-packages': {
      const payload = data as {
        environmentPath: string;
        environmentType: 'python' | 'node' | 'java' | 'go';
      };
      return {
        dependencies: systemScanner.scanInstalledDependencies(
          payload.environmentPath,
          payload.environmentType
        ),
      };
    }

    case 'env:export-requirements': {
      const payload = data as {
        environmentName: string;
        environmentPath: string;
        environmentType: 'python' | 'node' | 'java' | 'go';
        dependencies?: Dependency[];
      };

      const dependencies =
        payload.dependencies && payload.dependencies.length > 0
          ? payload.dependencies
          : systemScanner.scanInstalledDependencies(
              payload.environmentPath,
              payload.environmentType
            );

      const defaultFileName = `${sanitizeFileName(payload.environmentName)}_requirements.txt`;
      const saveDialogOptions = {
        title: '导出依赖配置',
        defaultPath: path.join(app.getPath('downloads'), defaultFileName),
        buttonLabel: '导出',
        filters: [
          { name: 'Requirements Text', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      };
      const result = activeMainWindow
        ? await dialog.showSaveDialog(activeMainWindow, saveDialogOptions)
        : await dialog.showSaveDialog(saveDialogOptions);

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      const content = formatRequirementsFile(payload, dependencies);
      fs.writeFileSync(result.filePath, content, 'utf-8');

      return {
        success: true,
        canceled: false,
        exportedPath: result.filePath,
        size: Buffer.byteLength(content, 'utf-8'),
      };
    }

    // 新增：卸载依赖包
    case 'env:uninstall-packages': {
      const payload = data as {
        environmentPath: string;
        environmentType: 'python' | 'node' | 'java' | 'go';
        packages: string[];
      };
      return envInstaller.uninstallPackages(payload);
    }

    // 新增：检测环境冲突
    case 'conflict:detect-new': {
      return conflictDetectorService.detectConflicts();
    }

    // 新增：修复环境冲突
    case 'conflict:fix-new': {
      const payload = data as {
        issues: ConflictIssue[];
        backupPath?: string;
      };
      return conflictFixerService.fixConflicts(payload);
    }

    // 新增：回滚冲突修复
    case 'conflict:rollback': {
      const payload = data as { backupPath: string };
      return conflictFixerService.rollback(payload.backupPath);
    }

    // 新增：系统修复
    case 'system:fix': {
      const payload = data as {
        fixType: 'shell-config' | 'env-vars' | 'permissions' | 'all';
        backupPath?: string;
      };
      return systemFixerService.fixSystem(payload);
    }

    // 新增：系统修复回滚
    case 'system:rollback': {
      const payload = data as { backupPath: string };
      return systemFixerService.rollback(payload.backupPath);
    }

    default:
      throw new Error(`Unsupported IPC channel: ${channel}`);
  }
}

function sanitizeFileName(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .map((character) => (character.charCodeAt(0) < 32 ? '_' : character))
    .join('');
  return sanitized || 'environment';
}

function formatRequirementsFile(
  environment: {
    environmentName: string;
    environmentPath: string;
    environmentType: string;
  },
  dependencies: Dependency[]
): string {
  const header = [
    `# Environment: ${environment.environmentName}`,
    `# Type: ${environment.environmentType}`,
    `# Path: ${environment.environmentPath}`,
    `# Exported at: ${new Date().toISOString()}`,
    `# Packages: ${dependencies.length}`,
    '',
  ];

  const body = dependencies
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((dep) => `${dep.name}==${dep.version}`);

  return [...header, ...body, ''].join('\n');
}

function filterDeletedScanResult(
  scanResult: Awaited<ReturnType<typeof systemScanner.scan>>
): Awaited<ReturnType<typeof systemScanner.scan>> {
  const environments = scanResult.environments.filter(
    (environment) => !persistenceManager.isEnvironmentDeleted(environment)
  );
  return {
    ...scanResult,
    environments,
    totalEnvironments: environments.length,
    healthyCount: environments.filter((environment) => environment.status === 'healthy').length,
    warningCount: environments.filter((environment) => environment.status === 'warning').length,
    errorCount: environments.filter((environment) => environment.status === 'error').length,
  };
}
