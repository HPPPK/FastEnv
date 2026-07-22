import path from 'path';

export const ELEVATION_PROTOCOL_VERSION = 1 as const;
export const ELEVATED_SYSTEM_PATH_OPERATION = 'write-system-path' as const;

export interface ElevatedSystemPathRequest {
  version: typeof ELEVATION_PROTOCOL_VERSION;
  operation: typeof ELEVATED_SYSTEM_PATH_OPERATION;
  requestId: string;
  platform: 'win32' | 'darwin' | 'linux';
  pathEntries: string[];
  backupPath: string;
}

export interface ElevatedSystemPathResult {
  version: typeof ELEVATION_PROTOCOL_VERSION;
  operation: typeof ELEVATED_SYSTEM_PATH_OPERATION;
  requestId: string;
  platform: string;
  success: boolean;
  changed: boolean;
  rolledBack: boolean;
  target: string;
  message: string;
  backupPath?: string;
  previousValue?: string;
  nextValue?: string;
  errorCode?: string;
  cancelled?: boolean;
}

export function mergePathEntries(
  existingPath: string,
  additions: string[],
  delimiter: string
): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of [...additions, ...existingPath.split(delimiter)]) {
    const entry = value.trim();
    if (!entry) continue;
    const key = delimiter === ';' ? entry.toLowerCase() : entry;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result.join(delimiter);
}

export function validateElevatedSystemPathRequest(value: unknown): ElevatedSystemPathRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('提权请求必须是 JSON 对象');
  }
  const request = value as Record<string, unknown>;
  const expectedKeys = [
    'version',
    'operation',
    'requestId',
    'platform',
    'pathEntries',
    'backupPath',
  ];
  const actualKeys = Object.keys(request).sort();
  if (actualKeys.join('|') !== expectedKeys.slice().sort().join('|')) {
    throw new Error('提权请求包含未授权字段');
  }
  if (
    request.version !== ELEVATION_PROTOCOL_VERSION ||
    request.operation !== ELEVATED_SYSTEM_PATH_OPERATION
  ) {
    throw new Error('提权请求版本或操作不在白名单内');
  }
  if (typeof request.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(request.requestId)) {
    throw new Error('提权请求 ID 无效');
  }
  if (
    request.platform !== 'win32' &&
    request.platform !== 'darwin' &&
    request.platform !== 'linux'
  ) {
    throw new Error('提权请求平台无效');
  }
  if (
    !Array.isArray(request.pathEntries) ||
    request.pathEntries.length < 1 ||
    request.pathEntries.length > 128
  ) {
    throw new Error('提权请求 PATH 条目数量无效');
  }
  const entries = request.pathEntries.map((entry) => {
    if (typeof entry !== 'string' || entry.trim().length === 0 || entry.length > 4096) {
      throw new Error('提权请求包含无效 PATH 条目');
    }
    if (
      Array.from(entry).some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      }) ||
      entry.includes('"')
    ) {
      throw new Error('提权请求 PATH 条目包含控制字符或引号');
    }
    if (
      (request.platform !== 'win32' && /[\r\n$]/.test(entry)) ||
      (request.platform !== 'win32' && entry.includes(String.fromCharCode(96)))
    ) {
      throw new Error('Unix 提权请求 PATH 条目包含未授权 shell 字符');
    }
    const trimmed = entry.trim();
    const absolute =
      request.platform === 'win32'
        ? /^[A-Za-z]:[\\/]/.test(trimmed) ||
          trimmed.startsWith('\\\\') ||
          /^%[A-Za-z_][A-Za-z0-9_]*%([\\/]|$)/.test(trimmed)
        : trimmed.startsWith('/');
    if (!absolute) throw new Error('提权请求 PATH 条目必须是绝对路径或 Windows 环境变量路径');
    return trimmed;
  });
  if (
    typeof request.backupPath !== 'string' ||
    !path.isAbsolute(request.backupPath) ||
    request.backupPath.length > 1024
  ) {
    throw new Error('提权请求备份路径无效');
  }
  return { ...request, pathEntries: entries } as ElevatedSystemPathRequest;
}
