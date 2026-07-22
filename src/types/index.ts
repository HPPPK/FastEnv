/**
 * 全局类型定义
 */

/**
 * 日志级别
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * 环境类型
 */
export const EnvironmentType = {
  PYTHON: 'python',
  NODE: 'node',
  JAVA: 'java',
  GO: 'go',
  GIT: 'git',
} as const;
export type EnvironmentType = (typeof EnvironmentType)[keyof typeof EnvironmentType] | string;

/**
 * 环境状态
 */
export const EnvironmentStatus = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  ERROR: 'error',
  UNKNOWN: 'unknown',
} as const;
export type EnvironmentStatus = (typeof EnvironmentStatus)[keyof typeof EnvironmentStatus];

/**
 * 包管理器类型
 */
export const PackageManager = {
  PIP: 'pip',
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm',
  CONDA: 'conda',
  MAVEN: 'maven',
  GRADLE: 'gradle',
  GO_MOD: 'go_mod',
} as const;
export type PackageManager = (typeof PackageManager)[keyof typeof PackageManager];

/**
 * 冲突类型
 */
export const ConflictType = {
  VERSION_MISMATCH: 'version_mismatch',
  PATH_PRIORITY: 'path_priority',
  DUPLICATE_PATH: 'duplicate_path',
  DEPENDENCY_CONFLICT: 'dependency_conflict',
  ENVIRONMENT_POLLUTION: 'environment_pollution',
  INVALID_PATH: 'invalid_path',
  MISSING_DEPENDENCY: 'missing_dependency',
  PERMISSION_DENIED: 'permission_denied',
  ENV_VAR_CONFLICT: 'env_var_conflict',
  MIRROR_FAILURE: 'mirror_failure',
  CORRUPTED_ENV: 'corrupted_env',
} as const;
export type ConflictType = (typeof ConflictType)[keyof typeof ConflictType];

/**
 * 冲突严重程度
 */
export const ConflictSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type ConflictSeverity = (typeof ConflictSeverity)[keyof typeof ConflictSeverity];

/**
 * 修复状态
 */
export const RepairStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  REPAIRING: 'repairing',
  SUCCESS: 'success',
  FAILED: 'failed',
  PARTIAL: 'partial',
} as const;
export type RepairStatus = (typeof RepairStatus)[keyof typeof RepairStatus];

/**
 * 依赖实体
 */
export interface Dependency {
  id?: string;
  name: string;
  version: string;
  packageManager?: PackageManager;
  type?: 'direct' | 'transitive';
  installedAt?: number;
  description?: string;
  homepage?: string;
  license?: string;
}

/**
 * 镜像源配置
 */
export interface MirrorSource {
  python?: string;
  npm?: string;
  maven?: string;
  cargo?: string;
  custom?: Record<string, string>;
}

/**
 * PATH 条目
 */
export interface PathEntry {
  index: number;
  path: string;
  priority: number;
  tools: EnvironmentType[];
  isDuplicate: boolean;
  isValid: boolean;
}

/**
 * 系统变量
 */
export interface SystemVariable {
  name: string;
  value: string;
  source: 'system' | 'user' | 'environment';
  isValid?: boolean;
}

/**
 * 已安装工具
 */
export interface InstalledTool {
  id?: string;
  name: string;
  type: EnvironmentType;
  version: string;
  path: string;
  isGlobal: boolean;
  isVirtual?: boolean;
  detectedAt?: number;
  status?: EnvironmentStatus;
}

/**
 * 环境实体
 */
export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  version: string;
  status: EnvironmentStatus;
  path: string;
  pythonPath?: string;
  nodePath?: string;
  javaPath?: string;
  goPath?: string;
  gitPath?: string;
  dependencies: Dependency[];
  createdAt: number;
  updatedAt: number;
  tags: string[];
  projectPath?: string;
  projectNote?: string;
  description?: string;
  isVirtual?: boolean;
  parentEnvId?: string;
  packageManager?: PackageManager;
  lastHealthCheck?: number;
  healthStatus?: EnvironmentStatus;
}

/**
 * 系统扫描结果
 */
export interface SystemScanResult {
  id: string;
  timestamp: number;
  platform: 'win32' | 'darwin' | 'linux';
  environments: Environment[];
  installedTools: InstalledTool[];
  pathEntries: PathEntry[];
  globalPath?: PathEntry[];
  virtualEnvironments?: unknown[];
  conflicts?: EnvironmentConflict[];
  systemVariables: SystemVariable[];
  totalEnvironments: number;
  healthyCount: number;
  warningCount: number;
  errorCount: number;
}

/**
 * 环境冲突
 */
export interface EnvironmentConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  affectedEnvironments: string[];
  description: string;
  suggestion?: string;
  suggestedFix?: string;
  detectedAt: number;
  isResolved?: boolean;
  autoFixable?: boolean;
  resolutionSteps?: string[];
}

export interface EnvironmentPermissionStatus {
  platform: NodeJS.Platform;
  isElevated: boolean;
  userPath: {
    writable: boolean;
    target: string;
    message: string;
  };
  systemPath: {
    writable: boolean;
    target: string;
    requiresElevation: boolean;
    message: string;
  };
}

export interface ElevationRequestResult {
  platform: NodeJS.Platform;
  success: boolean;
  requiresRestart: boolean;
  message: string;
}

export interface ElevatedSystemPathResult {
  version: number;
  operation: 'write-system-path';
  requestId: string;
  platform: string;
  success: boolean;
  changed: boolean;
  rolledBack: boolean;
  cancelled?: boolean;
  target: string;
  message: string;
  backupPath?: string;
  previousValue?: string;
  nextValue?: string;
  errorCode?: string;
}

/**
 * 修复记录
 */
export interface RepairRecord {
  id: string;
  timestamp?: number;
  startTime?: number;
  endTime?: number;
  environmentId?: string;
  conflicts: EnvironmentConflict[];
  status: RepairStatus;
  backupPath?: string;
  changes: Array<string | { type: string; target: string; description: string }>;
  logs: string[];
  errorMessage?: string;
  duration?: number;
  rollbackable: boolean;
}

/**
 * 需求输入
 */
export interface DemandInput {
  type: 'text' | 'document' | 'image';
  content: string;
  fileName?: string;
  fileContent?: string;
}

/**
 * 需求分析结果
 */
export interface DemandAnalysis {
  id: string;
  timestamp: number;
  rawInput: string;
  detectedLanguages: string[];
  detectedVersions: Array<{ language: string; version: string }>;
  requiredDependencies: string[];
  suggestedScenario: string;
  confidence: number;
  recommendations: string[];
  scenario?: string;
  requiredLanguages?: EnvironmentType[];
  requiredVersions?: Record<string, string>;
  recommendedEnvironmentType?: 'new' | 'upgrade';
  suggestedEnvironmentName?: string;
  details?: string;
}

/**
 * 创建环境参数
 */
export interface CreateEnvParams {
  name: string;
  type: EnvironmentType;
  version: string;
  isVirtual: boolean;
  parentEnvId?: string;
  dependencies?: string[];
  projectPath?: string;
  description?: string;
  tags?: string[];
}

/**
 * 安装参数
 */
export interface InstallParams {
  envId: string;
  packages: string[];
  packageManager: PackageManager;
  upgradeExisting?: boolean;
}

/**
 * 安装结果
 */
export interface InstallResult {
  id: string;
  envId: string;
  timestamp: number;
  packages: string[];
  installed: Dependency[];
  failed: string[];
  duration: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * 用户配置
 */
export interface UserConfig {
  userId?: string;
  username?: string;
  email?: string;
  theme: 'light' | 'dark';
  language: 'zh' | 'zh-CN' | 'en';
  autoBackup: boolean;
  backupInterval?: number;
  logLevel: LogLevel;
  mirrorSource?: MirrorSource;
  customMirrorUrl?: string;
  defaultVenvPath?: string;
  enableAutoUpdate?: boolean;
  enableNotifications?: boolean;
  autoRepairBeforeBackup?: boolean;
  defaultVirtualEnvPath?: string;
  enableScanPermission?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * 环境配置
 */
export interface EnvironmentConfig {
  envId: string;
  pythonVersion?: string;
  nodeVersion?: string;
  javaVersion?: string;
  goVersion?: string;
  gitVersion?: string;
  packageManager: PackageManager;
  mirrorSource: MirrorSource;
  customMirrorUrl?: string;
  enableAutoActivate: boolean;
  enableAutoUpdate: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 全局系统配置
 */
export interface GlobalSystemConfig {
  appVersion?: string;
  version?: string;
  dataVersion?: string;
  lastUpdated?: number;
  lastScanTime?: number;
  lastRepairTime?: number;
  totalEnvironments?: number;
  totalRepairs?: number;
  systemPlatform?: 'win32' | 'darwin' | 'linux';
  nodeVersion?: string;
  electronVersion?: string;
  environments?: Environment[];
  repairRecords?: RepairRecord[];
  userConfig?: UserConfig;
  conflictRules?: unknown[];
  createdAt?: number;
  updatedAt?: number;
}

/**
 * 日志条目
 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  stackTrace?: string;
}

/**
 * 应用设置
 */
export interface AppSettings {
  userId?: string;
  theme: 'light' | 'dark';
  language: 'zh' | 'zh-CN' | 'en';
  autoBackup: boolean;
  backupInterval?: number;
  logLevel: LogLevel;
  mirrorSource?: MirrorSource;
  customMirrorUrl?: string;
  defaultVenvPath?: string;
  enableAutoUpdate?: boolean;
  enableNotifications?: boolean;
  mirrorPython?: string;
  mirrorNpm?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * 通知
 */
export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * 用户需求
 */
export interface UserDemand {
  id: string;
  type: 'text' | 'document' | 'image';
  content: string;
  fileName?: string;
  timestamp: number;
}

/**
 * 操作结果
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

/**
 * 需求解析结果
 */
export interface DemandParseResult {
  id?: string;
  timestamp?: number;
  success?: boolean;
  scenario?: string;
  requiredLanguages?: EnvironmentType[];
  requiredVersions?: Record<string, string>;
  requiredDependencies?: string[];
  recommendedEnvironmentType?: 'new' | 'upgrade';
  suggestedEnvironmentName?: string;
  confidence: number;
  details?: string;
  detectedTypes?: EnvironmentType[];
  dependencies?: string[];
  recommendations?: EnvironmentRecommendation[];
  warnings?: string[];
  [key: string]: unknown;
}

/**
 * 环境推荐
 */
export interface EnvironmentRecommendation {
  id?: string;
  name?: string;
  environmentName?: string;
  primaryLanguage?: EnvironmentType | string;
  languages?: EnvironmentType[];
  estimatedSetupTime?: number | string;
  reason?: string;
  type?: EnvironmentType;
  version?: string;
  description: string;
  dependencies?: string[];
  score?: number;
  [key: string]: unknown;
}

/**
 * AI 客户端信息
 */
export interface AIClientInfo {
  id: string;
  name: string;
  type: 'desktop' | 'browser' | 'local';
  version?: string;
  isAvailable: boolean;
  isLoggedIn?: boolean;
  path?: string;
  lastChecked?: number;
}

/**
 * AI 集成配置
 */
export interface AIIntegrationConfig {
  mode: 'offline' | 'desktop-client' | 'browser';
  enableOfflineMode: boolean;
  enableDesktopMode: boolean;
  enableBrowserMode: boolean;
  preferredClient?: string;
  autoDetectClients: boolean;
  userConsent: boolean;
  consentMode?: 'all' | 'offline-only' | 'none';
}

/**
 * AI 解析请求
 */
export interface AIParseRequest {
  type: 'requirement' | 'error' | 'config' | 'document' | 'image';
  content: string;
  filename?: string;
  rawContent?: string;
}

/**
 * AI 解析响应
 */
export interface AIParseResponse {
  success: boolean;
  analysis: DemandAnalysis;
  mode: 'offline' | 'desktop-client' | 'browser';
  confidence: number;
  error?: string;
}
