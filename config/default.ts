/**
 * 默认配置
 * 应用启动时的默认配置值
 */

import type { GlobalSystemConfig, UserConfig } from '../src/types/index';
import { DEFAULT_CONFIG, MIRROR_SOURCES, CONFLICT_RULES } from './constants';

/**
 * 默认用户配置
 */
export const defaultUserConfig: UserConfig = {
  theme: DEFAULT_CONFIG.theme,
  language: DEFAULT_CONFIG.language,
  autoBackup: DEFAULT_CONFIG.autoBackup,
  autoRepairBeforeBackup: DEFAULT_CONFIG.autoRepairBeforeBackup,
  logLevel: 'info',
  defaultVirtualEnvPath: '',
  enableScanPermission: DEFAULT_CONFIG.enableScanPermission,
  mirrorSource: {
    python: MIRROR_SOURCES.python.aliyun,
    npm: MIRROR_SOURCES.npm.aliyun,
    maven: MIRROR_SOURCES.maven.aliyun,
    cargo: MIRROR_SOURCES.cargo.official,
    custom: {},
  },
};

/**
 * 默认全局系统配置
 */
export const defaultGlobalConfig: GlobalSystemConfig = {
  version: '0.1.0',
  lastUpdated: Date.now(),
  environments: [],
  repairRecords: [],
  userConfig: defaultUserConfig,
  conflictRules: Object.values(CONFLICT_RULES).map((rule) => ({
    id: rule.id,
    type: rule.id as any,
    pattern: '',
    severity: rule.severity,
    autoFixable: rule.autoFixable,
    description: rule.description,
  })),
};

/**
 * 获取默认配置的深拷贝
 */
export function getDefaultConfig(): GlobalSystemConfig {
  return JSON.parse(JSON.stringify(defaultGlobalConfig));
}

/**
 * 获取默认用户配置的深拷贝
 */
export function getDefaultUserConfig(): UserConfig {
  return JSON.parse(JSON.stringify(defaultUserConfig));
}
