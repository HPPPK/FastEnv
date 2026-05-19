/**
 * 全局常量定义
 * 企业级应用的所有常量统一管理
 */

// ============ 应用信息 ============
export const APP_INFO = {
  name: 'EnvGuard',
  version: '0.1.0',
  description: 'Enterprise-grade development environment manager',
  author: 'EnvGuard Team',
  homepage: 'https://envguard.dev',
  repository: 'https://github.com/envguard/envguard',
} as const;

// ============ 路径常量 ============
export const PATHS = {
  CONFIG_DIR: '.envguard',
  CONFIG_FILE: 'config.json',
  BACKUP_DIR: 'backups',
  LOG_DIR: 'logs',
  CACHE_DIR: 'cache',
} as const;

// ============ 超时配置 ============
export const TIMEOUTS = {
  SYSTEM_SCAN: 30000, // 系统扫描超时 30秒
  ENV_CREATE: 60000, // 环境创建超时 60秒
  DEPENDENCY_INSTALL: 300000, // 依赖安装超时 5分钟
  CONFLICT_DETECT: 60000, // 冲突检测超时 60秒
  CONFLICT_FIX: 120000, // 冲突修复超时 2分钟
  IPC_REQUEST: 30000, // IPC请求超时 30秒
} as const;

// ============ 日志配置 ============
export const LOG_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
  LOG_LEVEL: 'info',
  INCLUDE_TIMESTAMP: true,
  INCLUDE_LEVEL: true,
  INCLUDE_MODULE: true,
} as const;

// ============ 镜像源配置 ============
export const MIRROR_SOURCES = {
  python: {
    aliyun: 'https://mirrors.aliyun.com/pypi/simple/',
    tsinghua: 'https://pypi.tsinghua.edu.cn/simple',
    official: 'https://pypi.org/simple/',
  },
  npm: {
    aliyun: 'https://registry.npmmirror.com',
    tsinghua: 'https://registry.npmmirror.com',
    official: 'https://registry.npmjs.org/',
  },
  maven: {
    aliyun: 'https://maven.aliyun.com/repository/public',
    official: 'https://repo.maven.apache.org/maven2',
  },
  cargo: {
    official: 'https://github.com/rust-lang/crates.io-index',
  },
} as const;

// ============ 默认配置 ============
export const DEFAULT_CONFIG = {
  theme: 'dark' as const,
  language: 'zh-CN',
  autoBackup: true,
  autoRepairBeforeBackup: true,
  logLevel: 'info' as const,
  enableScanPermission: true,
  defaultMirrorSource: 'aliyun',
} as const;

// ============ 环境类型配置 ============
export const ENV_TYPE_CONFIG = {
  python: {
    name: 'Python',
    icon: 'python',
    packageManager: 'pip',
    versionPattern: /^(\d+\.\d+\.\d+)$/,
    commands: {
      version: 'python --version',
      list: 'pip list',
    },
  },
  node: {
    name: 'Node.js',
    icon: 'nodejs',
    packageManager: 'npm',
    versionPattern: /^v(\d+\.\d+\.\d+)$/,
    commands: {
      version: 'node --version',
      list: 'npm list -g --depth=0',
    },
  },
  java: {
    name: 'Java',
    icon: 'java',
    packageManager: 'maven',
    versionPattern: /^(\d+\.\d+\.\d+)$/,
    commands: {
      version: 'java -version',
      list: 'mvn -v',
    },
  },
  go: {
    name: 'Go',
    icon: 'go',
    packageManager: 'go_mod',
    versionPattern: /^go(\d+\.\d+\.\d+)$/,
    commands: {
      version: 'go version',
      list: 'go list -m all',
    },
  },
  rust: {
    name: 'Rust',
    icon: 'rust',
    packageManager: 'cargo',
    versionPattern: /^(\d+\.\d+\.\d+)$/,
    commands: {
      version: 'rustc --version',
      list: 'cargo list',
    },
  },
} as const;

// ============ 冲突规则配置 ============
export const CONFLICT_RULES = {
  PATH_PRIORITY: {
    id: 'path_priority',
    severity: 'high' as const,
    autoFixable: true,
    description: 'PATH环境变量中存在优先级冲突',
  },
  VERSION_MISMATCH: {
    id: 'version_mismatch',
    severity: 'high' as const,
    autoFixable: true,
    description: '依赖版本不匹配',
  },
  DEPENDENCY_CONFLICT: {
    id: 'dependency_conflict',
    severity: 'high' as const,
    autoFixable: true,
    description: '依赖包之间存在冲突',
  },
  ENV_VAR_CONFLICT: {
    id: 'env_var_conflict',
    severity: 'medium' as const,
    autoFixable: true,
    description: '环境变量配置冲突',
  },
  MIRROR_FAILURE: {
    id: 'mirror_failure',
    severity: 'medium' as const,
    autoFixable: true,
    description: '镜像源访问失败',
  },
  PERMISSION_DENIED: {
    id: 'permission_denied',
    severity: 'critical' as const,
    autoFixable: false,
    description: '权限不足',
  },
  CORRUPTED_ENV: {
    id: 'corrupted_env',
    severity: 'critical' as const,
    autoFixable: true,
    description: '环境配置损坏',
  },
  DUPLICATE_PATH: {
    id: 'duplicate_path',
    severity: 'low' as const,
    autoFixable: true,
    description: 'PATH中存在重复路径',
  },
} as const;

// ============ 虚拟环境类型配置 ============
export const VIRTUAL_ENV_TYPE_CONFIG = {
  venv: {
    name: 'Python venv',
    command: 'python -m venv',
    activateCommand: {
      win32: 'Scripts\\activate.bat',
      darwin: 'bin/activate',
      linux: 'bin/activate',
    },
  },
  conda: {
    name: 'Conda',
    command: 'conda create -n',
    activateCommand: {
      win32: 'Scripts\\activate.bat',
      darwin: 'bin/activate',
      linux: 'bin/activate',
    },
  },
  nvm: {
    name: 'Node Version Manager',
    command: 'nvm install',
    activateCommand: {
      win32: 'nvm use',
      darwin: 'nvm use',
      linux: 'nvm use',
    },
  },
  pyenv: {
    name: 'Python Version Manager',
    command: 'pyenv install',
    activateCommand: {
      win32: 'pyenv shell',
      darwin: 'pyenv shell',
      linux: 'pyenv shell',
    },
  },
  jenv: {
    name: 'Java Version Manager',
    command: 'jenv add',
    activateCommand: {
      win32: 'jenv shell',
      darwin: 'jenv shell',
      linux: 'jenv shell',
    },
  },
} as const;

// ============ 状态码定义 ============
export const STATUS_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  PARTIAL_SUCCESS: 2,
  TIMEOUT: 3,
  CANCELLED: 4,
  PERMISSION_DENIED: 5,
  NOT_FOUND: 6,
  ALREADY_EXISTS: 7,
  INVALID_ARGUMENT: 8,
  INTERNAL_ERROR: 9,
} as const;

// ============ 错误消息 ============
export const ERROR_MESSAGES = {
  SYSTEM_SCAN_FAILED: '系统扫描失败',
  ENV_CREATE_FAILED: '环境创建失败',
  ENV_DELETE_FAILED: '环境删除失败',
  DEPENDENCY_INSTALL_FAILED: '依赖安装失败',
  CONFLICT_DETECT_FAILED: '冲突检测失败',
  CONFLICT_FIX_FAILED: '冲突修复失败',
  CONFIG_LOAD_FAILED: '配置加载失败',
  CONFIG_SAVE_FAILED: '配置保存失败',
  PERMISSION_DENIED: '权限不足',
  TIMEOUT: '操作超时',
  INVALID_ARGUMENT: '参数无效',
  INTERNAL_ERROR: '内部错误',
} as const;

// ============ 成功消息 ============
export const SUCCESS_MESSAGES = {
  SYSTEM_SCAN_SUCCESS: '系统扫描完成',
  ENV_CREATE_SUCCESS: '环境创建成功',
  ENV_DELETE_SUCCESS: '环境删除成功',
  DEPENDENCY_INSTALL_SUCCESS: '依赖安装成功',
  CONFLICT_DETECT_SUCCESS: '冲突检测完成',
  CONFLICT_FIX_SUCCESS: '冲突修复成功',
  CONFIG_SAVE_SUCCESS: '配置保存成功',
} as const;

// ============ 正则表达式模式 ============
export const REGEX_PATTERNS = {
  VERSION: /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/,
  SEMVER: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
  PATH: /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/,
  ENV_VAR_NAME: /^[A-Z_][A-Z0-9_]*$/,
  PACKAGE_NAME: /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/,
} as const;

// ============ 文件扩展名 ============
export const FILE_EXTENSIONS = {
  PYTHON: ['.py', '.pyw'],
  JAVASCRIPT: ['.js', '.jsx', '.mjs'],
  TYPESCRIPT: ['.ts', '.tsx'],
  JAVA: ['.java'],
  GO: ['.go'],
  RUST: ['.rs'],
  JSON: ['.json'],
  YAML: ['.yaml', '.yml'],
  TEXT: ['.txt', '.md'],
  IMAGE: ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
} as const;

// ============ 平台特定配置 ============
export const PLATFORM_CONFIG = {
  win32: {
    pathSeparator: ';',
    pathDelimiter: '\\',
    shell: 'cmd.exe',
    shellArgs: ['/c'],
  },
  darwin: {
    pathSeparator: ':',
    pathDelimiter: '/',
    shell: '/bin/bash',
    shellArgs: ['-c'],
  },
  linux: {
    pathSeparator: ':',
    pathDelimiter: '/',
    shell: '/bin/bash',
    shellArgs: ['-c'],
  },
} as const;
