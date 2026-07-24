import type {
  DemandParseResult,
  Environment,
  EnvironmentConflict,
  RepairRecord,
  SystemScanResult,
  Dependency,
  AppSettings,
  EnvironmentPermissionStatus,
  ElevationRequestResult,
  ElevatedSystemPathResult,
} from '../types';
import { ipcClient } from '../utils/ipc-client';

export interface ConflictSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DependencyInstallProgress {
  operationId: string;
  package: string;
  status: 'installing' | 'success' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  error?: string;
}

export interface CreateEnvironmentProgress {
  operationId: string;
  stage:
    | 'preparing'
    | 'creating'
    | 'installing'
    | 'verifying'
    | 'completed'
    | 'cancelled'
    | 'failed';
  progress: number;
  message: string;
  currentPackage?: string;
}

export const envguardApi = {
  async scanSystem(): Promise<SystemScanResult> {
    return ipcClient.invoke<SystemScanResult>('system:scan');
  },

  async getEnvironmentPermissionStatus(): Promise<EnvironmentPermissionStatus> {
    return ipcClient.invoke<EnvironmentPermissionStatus>('system:permissions');
  },

  async requestEnvironmentElevation(): Promise<ElevationRequestResult> {
    return ipcClient.invoke<ElevationRequestResult>('system:elevation-request', undefined, 120000);
  },

  async writeSystemPathWithElevation(pathEntries: string[]): Promise<ElevatedSystemPathResult> {
    return ipcClient.invoke<ElevatedSystemPathResult>(
      'system:write-path-elevated',
      { pathEntries },
      120000
    );
  },

  async listEnvironments(): Promise<Environment[]> {
    const response = await ipcClient.invoke<{ environments: Environment[] }>('env:list');
    return response.environments;
  },

  async createEnvironment(payload: {
    name: string;
    type: string;
    version?: string;
    path?: string;
    tags?: string[];
    projectNote?: string;
    dependencies?: string[];
    operationId?: string;
  }): Promise<Environment> {
    const response = await ipcClient.invoke<{ environment: Environment }>(
      'env:create',
      payload,
      10 * 60 * 1000
    );
    return response.environment;
  },

  async cancelEnvironmentCreation(operationId: string): Promise<{ success: boolean }> {
    return ipcClient.invoke('env:create-cancel', { operationId }, 10000);
  },

  onCreateEnvironmentProgress(callback: (progress: CreateEnvironmentProgress) => void): () => void {
    return ipcClient.on<CreateEnvironmentProgress>('env:create:progress', callback);
  },

  async parseDemand(payload: {
    type: 'text' | 'document' | 'image';
    content: string;
  }): Promise<DemandParseResult> {
    return ipcClient.invoke<DemandParseResult>('demand:parse', payload);
  },

  async detectConflicts(): Promise<{
    conflicts: EnvironmentConflict[];
    summary: ConflictSummary;
  }> {
    return ipcClient.invoke('conflict:detect');
  },

  async fixConflicts(): Promise<{
    repairRecord: RepairRecord;
    success: boolean;
  }> {
    return ipcClient.invoke('conflict:fix');
  },

  async listRepairRecords(): Promise<RepairRecord[]> {
    const response = await ipcClient.invoke<{ records?: RepairRecord[] }>('repair-records:list');
    return response.records ?? [];
  },

  async getConfig(): Promise<AppSettings> {
    const response = await ipcClient.invoke<{ config: AppSettings }>('config:get');
    return response.config;
  },

  async setConfig(config: AppSettings): Promise<{ success: boolean }> {
    return ipcClient.invoke('config:set', config);
  },

  async pickRequirementFile(): Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    fileName?: string;
    extension?: string;
    content?: string;
    size?: number;
  }> {
    return ipcClient.invoke('file:pick', undefined, 120000);
  },

  async exportConfiguration(): Promise<{ success: boolean; canceled?: boolean; exportedPath?: string }> {
    return ipcClient.invoke('config:export', undefined, 120000);
  },

  async importConfiguration(): Promise<{
    success: boolean;
    canceled?: boolean;
    importedPath?: string;
    config?: AppSettings;
  }> {
    return ipcClient.invoke('config:import', undefined, 120000);
  },

  async getLogs(lines: number = 200): Promise<{
    logs: import('../types').LogEntry[];
    total: number;
    content: string;
    lines: number;
  }> {
    return ipcClient.invoke('log:get', { lines });
  },

  async clearLogs(): Promise<{ success: boolean }> {
    return ipcClient.invoke('log:clear');
  },

  async exportLogs(): Promise<{ success: boolean; canceled?: boolean; exportedPath?: string }> {
    return ipcClient.invoke('log:export', undefined, 120000);
  },

  async cancelDependencyInstall(
    operationId: string
  ): Promise<{ success: boolean; operationId: string }> {
    return ipcClient.invoke('env:install-cancel', { operationId }, 10000);
  },

  async installDependency(
    environmentPath: string,
    environmentType: string,
    packages: string[],
    operationId?: string
  ): Promise<{
    success: boolean;
    cancelled?: boolean;
    error?: string;
    message?: string;
    failed?: string[];
    details?: Record<string, unknown>;
  }> {
    return ipcClient.invoke('env:install-packages', {
      environmentPath,
      environmentType,
      packages,
      operationId,
    });
  },

  onDependencyInstallProgress(callback: (progress: DependencyInstallProgress) => void): () => void {
    return ipcClient.on<DependencyInstallProgress>('dependency:install:progress', callback);
  },

  async deleteEnvironment(
    environment: Environment,
    deleteData = true
  ): Promise<{ success: boolean; deletedData?: boolean }> {
    return ipcClient.invoke('env:delete', {
      environmentId: environment.id,
      environment,
      deleteData,
    });
  },

  async updateEnvironment(
    environmentId: string,
    updates: Partial<Environment>
  ): Promise<Environment> {
    const response = await ipcClient.invoke<{ environment: Environment }>('env:update', {
      environmentId,
      updates,
    });
    return response.environment;
  },

  async getInstalledPackages(
    environmentPath: string,
    environmentType: string
  ): Promise<Dependency[]> {
    const response = await ipcClient.invoke<{ dependencies: Dependency[] }>(
      'env:get-installed-packages',
      {
        environmentPath,
        environmentType,
      }
    );
    return response.dependencies;
  },

  async exportRequirements(payload: {
    environmentName: string;
    environmentPath: string;
    environmentType: string;
    dependencies?: Dependency[];
  }): Promise<{
    success: boolean;
    canceled?: boolean;
    exportedPath?: string;
    size?: number;
  }> {
    return ipcClient.invoke('env:export-requirements', payload);
  },
};
