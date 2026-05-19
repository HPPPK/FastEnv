import type {
  DemandParseResult,
  Environment,
  EnvironmentConflict,
  RepairRecord,
  SystemScanResult,
  Dependency,
} from '../types';
import { ipcClient } from '../utils/ipc-client';

export interface ConflictSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CreateEnvironmentProgress {
  operationId: string;
  stage: 'preparing' | 'creating' | 'installing' | 'verifying' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  message: string;
  currentPackage?: string;
}

export const envguardApi = {
  async scanSystem(): Promise<SystemScanResult> {
    return ipcClient.invoke<SystemScanResult>('system:scan');
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

  async installDependency(
    environmentPath: string,
    environmentType: string,
    packages: string[]
  ): Promise<{ success: boolean; error?: string }> {
    return ipcClient.invoke('env:install-packages', {
      environmentPath,
      environmentType,
      packages,
    });
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
    const response = await ipcClient.invoke<{ dependencies: Dependency[] }>('env:get-installed-packages', {
      environmentPath,
      environmentType,
    });
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
