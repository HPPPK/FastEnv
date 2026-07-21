/**
 * IPC 通信通道定义
 * 前后端进程通信的所有通道统一管理
 */

import type {
  Environment,
  SystemScanResult,
  EnvironmentConflict,
  RepairRecord,
  DemandAnalysis,
  UserConfig,
} from './index';

// ============ IPC 通道名称常量 ============

export const IPC_CHANNELS = {
  // 系统扫描相关
  SYSTEM_SCAN: 'system:scan',
  SYSTEM_SCAN_PROGRESS: 'system:scan:progress',

  // 环境管理相关
  ENV_LIST: 'env:list',
  ENV_CREATE: 'env:create',
  ENV_DELETE: 'env:delete',
  ENV_RENAME: 'env:rename',
  ENV_ACTIVATE: 'env:activate',
  ENV_DETAIL: 'env:detail',
  ENV_HEALTH_CHECK: 'env:health-check',

  // 依赖管理相关
  DEPENDENCY_INSTALL: 'dependency:install',
  DEPENDENCY_UNINSTALL: 'dependency:uninstall',
  DEPENDENCY_LIST: 'dependency:list',
  DEPENDENCY_INSTALL_PROGRESS: 'dependency:install:progress',

  // 冲突检测与修复相关
  CONFLICT_DETECT: 'conflict:detect',
  CONFLICT_DETECT_PROGRESS: 'conflict:detect:progress',
  CONFLICT_FIX: 'conflict:fix',
  CONFLICT_FIX_PROGRESS: 'conflict:fix:progress',
  CONFLICT_ROLLBACK: 'conflict:rollback',

  // 需求解析相关
  DEMAND_PARSE: 'demand:parse',
  DEMAND_PARSE_PROGRESS: 'demand:parse:progress',

  // 配置管理相关
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_EXPORT: 'config:export',
  CONFIG_IMPORT: 'config:import',

  // 日志相关
  LOG_GET: 'log:get',
  LOG_CLEAR: 'log:clear',

  // 文件操作相关
  FILE_OPEN: 'file:open',
  FILE_SAVE: 'file:save',
  FILE_PICK: 'file:pick',

  // 系统相关
  SYSTEM_INFO: 'system:info',
  SYSTEM_OPEN_PATH: 'system:open-path',
  SYSTEM_OPEN_URL: 'system:open-url',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS] | string;

export interface IPCRequest<T = unknown> {
  id: string;
  channel: IPCChannel;
  data?: T;
  timestamp: number;
}

export interface IPCResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}

export interface IPCEvent<T = unknown> {
  channel: IPCChannel;
  data: T;
  timestamp: number;
}

// ============ 系统扫描相关请求/响应 ============

export interface SystemScanRequest {
  includeVirtualEnv?: boolean;
  includeGlobalPath?: boolean;
  timeout?: number;
}

export interface SystemScanResponse {
  result: SystemScanResult;
  duration: number;
}

// ============ 环境管理相关请求/响应 ============

export interface EnvCreateRequest {
  name: string;
  type: string; // EnvironmentType
  version?: string;
  virtualEnvType: string; // VirtualEnvType
  path?: string;
  tags?: string[];
  projectNote?: string;
}

export interface EnvCreateResponse {
  environment: Environment;
  setupLogs: string[];
}

export interface EnvDeleteRequest {
  environmentId: string;
  deleteData?: boolean;
}

export interface EnvRenameRequest {
  environmentId: string;
  newName: string;
}

export interface EnvActivateRequest {
  environmentId: string;
}

export interface EnvActivateResponse {
  success: boolean;
  activationCommand: string;
}

export interface EnvDetailRequest {
  environmentId: string;
}

export interface EnvDetailResponse {
  environment: Environment;
  dependencies: Array<{
    name: string;
    version: string;
    size?: string;
  }>;
  lastHealthCheck?: {
    timestamp: number;
    status: string;
    issues: string[];
  };
}

// ============ 依赖管理相关请求/响应 ============

export interface DependencyInstallRequest {
  environmentId: string;
  packages: Array<{
    name: string;
    version?: string;
  }>;
  upgrade?: boolean;
}

export interface DependencyInstallResponse {
  success: boolean;
  installed: string[];
  failed: string[];
  logs: string[];
}

export interface DependencyListRequest {
  environmentId: string;
}

export interface DependencyListResponse {
  dependencies: Array<{
    name: string;
    version: string;
    type: 'direct' | 'transitive';
    size?: string;
  }>;
}

// ============ 冲突检测与修复相关请求/响应 ============

export interface ConflictDetectRequest {
  environmentIds?: string[]; // 如果为空则检测所有环境
  includeGlobalPath?: boolean;
}

export interface ConflictDetectResponse {
  conflicts: EnvironmentConflict[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ConflictFixRequest {
  conflictIds: string[];
  autoFix?: boolean;
  backupBeforeFix?: boolean;
}

export interface ConflictFixResponse {
  repairRecord: RepairRecord;
  success: boolean;
  summary: {
    fixed: number;
    failed: number;
    partial: number;
  };
}

export interface ConflictRollbackRequest {
  repairRecordId: string;
}

export interface ConflictRollbackResponse {
  success: boolean;
  restoredItems: string[];
}

// ============ 需求解析相关请求/响应 ============

export interface DemandParseRequest {
  type: 'text' | 'document' | 'image';
  content: string; // 文本内容或文件路径
  rawContent?: string; // 原始内容（OCR结果等）
}

export interface DemandParseResponse {
  analysis: DemandAnalysis;
  confidence: number;
  suggestedEnvironmentSetup: {
    type: string;
    version: string;
    packages: string[];
  };
}

// ============ 配置管理相关请求/响应 ============

export interface ConfigGetRequest {
  key?: string; // 如果为空则获取全部配置
}

export interface ConfigGetResponse {
  config: UserConfig | Record<string, unknown>;
}

export interface ConfigSetRequest {
  key: string;
  value: unknown;
}

export interface ConfigSetResponse {
  success: boolean;
}

export interface ConfigExportRequest {
  outputPath: string;
  includeEnvironments?: boolean;
  includeRepairRecords?: boolean;
}

export interface ConfigExportResponse {
  success: boolean;
  exportedPath: string;
  size: number;
}

export interface ConfigImportRequest {
  inputPath: string;
  merge?: boolean;
}

export interface ConfigImportResponse {
  success: boolean;
  importedItems: {
    environments: number;
    repairRecords: number;
    config: boolean;
  };
}

// ============ 日志相关请求/响应 ============

export interface LogGetRequest {
  level?: string;
  module?: string;
  limit?: number;
  offset?: number;
}

export interface LogGetResponse {
  logs: Array<{
    timestamp: number;
    level: string;
    module: string;
    message: string;
  }>;
  total: number;
}

// ============ 文件操作相关请求/响应 ============

export interface FilePickRequest {
  type: 'file' | 'directory';
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface FilePickResponse {
  path: string;
  cancelled: boolean;
}

export interface FileOpenRequest {
  path: string;
}

export interface FileSaveRequest {
  path: string;
  content: string;
}

export interface FileSaveResponse {
  success: boolean;
  path: string;
}

// ============ 系统相关请求/响应 ============

export interface SystemInfoResponse {
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  nodeVersion: string;
  appVersion: string;
  homeDir: string;
}

export interface SystemOpenPathRequest {
  path: string;
}

export interface SystemOpenUrlRequest {
  url: string;
}

// ============ 进度事件类型 ============

export interface ProgressEvent {
  current: number;
  total: number;
  percentage: number;
  message: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============ 错误响应类型 ============

export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
}
