import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REG_EXE = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'reg.exe');
import {
  ELEVATED_SYSTEM_PATH_OPERATION,
  ELEVATION_PROTOCOL_VERSION,
  mergePathEntries,
  validateElevatedSystemPathRequest,
  type ElevatedSystemPathRequest,
  type ElevatedSystemPathResult,
} from './elevation-protocol';

interface PreviousState {
  platform: string;
  target: string;
  exists: boolean;
  value?: string;
  type?: string;
  content?: string;
}

function writeAtomic(target: string, content: string): void {
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink())
    throw new Error('拒绝写入符号链接目标');
  const temporary = path.join(directory, '.envguard-' + process.pid + '-' + Date.now() + '.tmp');
  fs.writeFileSync(temporary, content, { encoding: 'utf8', mode: 0o644 });
  try {
    fs.renameSync(temporary, target);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {
      /* best effort */
    }
    throw error;
  }
}

function queryWindowsPath(): { exists: boolean; value: string; type?: string } {
  try {
    const output = execFileSync(
      REG_EXE,
      [
        'query',
        'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment',
        '/v',
        'Path',
      ],
      { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const match = output.match(/^\s*Path\s+(REG_\S+)\s+(.*)$/im);
    return {
      exists: Boolean(match),
      value: match?.[2]?.trim() ?? '',
      type: match?.[1] ?? 'REG_EXPAND_SZ',
    };
  } catch {
    return { exists: false, value: '', type: 'REG_EXPAND_SZ' };
  }
}

function restoreWindowsPath(previous: { exists: boolean; value?: string; type?: string }): void {
  const target = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment';
  if (previous.exists)
    execFileSync(
      REG_EXE,
      [
        'add',
        target,
        '/v',
        'Path',
        '/t',
        previous.type ?? 'REG_EXPAND_SZ',
        '/d',
        previous.value ?? '',
        '/f',
      ],
      { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );
  else {
    try {
      execFileSync(REG_EXE, ['delete', target, '/v', 'Path', '/f'], {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      /* already absent */
    }
  }
}

function readPreviousState(request: ElevatedSystemPathRequest): PreviousState {
  if (request.platform === 'win32') {
    const current = queryWindowsPath();
    return {
      platform: request.platform,
      target: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment\\Path',
      exists: current.exists,
      value: current.value,
      type: current.type,
    };
  }
  const target =
    request.platform === 'darwin' ? '/etc/paths.d/envguard' : '/etc/profile.d/envguard.sh';
  const exists = fs.existsSync(target);
  return {
    platform: request.platform,
    target,
    exists,
    content: exists ? fs.readFileSync(target, 'utf8') : undefined,
  };
}

function restoreUnixFile(state: PreviousState): void {
  if (state.exists) writeAtomic(state.target, state.content ?? '');
  else if (fs.existsSync(state.target)) {
    if (fs.lstatSync(state.target).isSymbolicLink()) throw new Error('拒绝删除符号链接目标');
    fs.rmSync(state.target);
  }
}

function writePlatformPath(
  request: ElevatedSystemPathRequest,
  previous: PreviousState
): { target: string; nextValue?: string } {
  if (request.platform === 'win32') {
    const current = queryWindowsPath();
    const next = mergePathEntries(current.value, request.pathEntries, ';');
    execFileSync(
      REG_EXE,
      [
        'add',
        'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment',
        '/v',
        'Path',
        '/t',
        current.type ?? 'REG_EXPAND_SZ',
        '/d',
        next,
        '/f',
      ],
      { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const verified = queryWindowsPath();
    if (verified.value !== next) throw new Error('系统 PATH 写入后校验失败');
    return { target: previous.target, nextValue: next };
  }
  const target =
    request.platform === 'darwin' ? '/etc/paths.d/envguard' : '/etc/profile.d/envguard.sh';
  if (request.platform === 'darwin') {
    const content = request.pathEntries.join('\n') + '\n';
    writeAtomic(target, content);
    if (fs.readFileSync(target, 'utf8') !== content) throw new Error('系统 paths.d 写入后校验失败');
    return { target, nextValue: content };
  }
  const prefix = request.pathEntries.join(':');
  const content =
    '# >>> EnvGuard managed system PATH >>>\n' +
    'export PATH="' +
    prefix +
    ':${PATH}"\n' +
    '# <<< EnvGuard managed system PATH <<<\n';
  writeAtomic(target, content);
  if (fs.readFileSync(target, 'utf8') !== content) throw new Error('系统 profile 写入后校验失败');
  return { target, nextValue: content };
}

function run(request: ElevatedSystemPathRequest): ElevatedSystemPathResult {
  const previous = readPreviousState(request);
  fs.writeFileSync(
    path.join(request.backupPath, 'system-path.json'),
    JSON.stringify(previous, null, 2),
    'utf8'
  );
  let changed = false;
  try {
    changed = true;
    const written = writePlatformPath(request, previous);
    return {
      version: ELEVATION_PROTOCOL_VERSION,
      operation: ELEVATED_SYSTEM_PATH_OPERATION,
      requestId: request.requestId,
      platform: request.platform,
      success: true,
      changed,
      rolledBack: false,
      target: written.target,
      message: '系统级 PATH 已由一次性提权助手写入并完成校验。',
      backupPath: request.backupPath,
      previousValue: previous.value ?? previous.content,
      nextValue: written.nextValue,
    };
  } catch (error) {
    if (changed) {
      try {
        if (request.platform === 'win32') restoreWindowsPath(previous);
        else restoreUnixFile(previous);
        changed = false;
      } catch (rollbackError) {
        return {
          version: ELEVATION_PROTOCOL_VERSION,
          operation: ELEVATED_SYSTEM_PATH_OPERATION,
          requestId: request.requestId,
          platform: request.platform,
          success: false,
          changed: true,
          rolledBack: false,
          target: previous.target,
          message:
            '系统 PATH 写入失败，自动回滚也失败：' +
            (rollbackError instanceof Error ? rollbackError.message : '未知错误'),
          backupPath: request.backupPath,
          errorCode: 'ROLLBACK_FAILED',
        };
      }
    }
    return {
      version: ELEVATION_PROTOCOL_VERSION,
      operation: ELEVATED_SYSTEM_PATH_OPERATION,
      requestId: request.requestId,
      platform: request.platform,
      success: false,
      changed,
      rolledBack: !changed,
      target: previous.target,
      message: '系统级 PATH 未完成写入：' + (error instanceof Error ? error.message : '未知错误'),
      backupPath: request.backupPath,
      errorCode: 'WRITE_FAILED',
    };
  }
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length !== 3) throw new Error('提权助手参数无效');
  const requestPath = path.resolve(args[0]);
  const resultPath = path.resolve(args[1]);
  const expectedHash = args[2];
  if (fs.existsSync(resultPath) && fs.lstatSync(resultPath).isSymbolicLink())
    throw new Error('拒绝写入符号链接结果文件');
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('提权请求完整性校验参数无效');
  const requestContent = fs.readFileSync(requestPath, 'utf8');
  const actualHash = crypto.createHash('sha256').update(requestContent, 'utf8').digest('hex');
  if (actualHash !== expectedHash) throw new Error('提权请求完整性校验失败');
  const request = validateElevatedSystemPathRequest(JSON.parse(requestContent) as unknown);
  if (request.platform !== process.platform) throw new Error('提权请求平台与助手平台不一致');
  if (!fs.existsSync(request.backupPath) || !fs.statSync(request.backupPath).isDirectory())
    throw new Error('提权请求备份目录不存在');
  if (fs.lstatSync(request.backupPath).isSymbolicLink())
    throw new Error('拒绝使用符号链接备份目录');
  const result = run(request);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  if (!result.success) process.exitCode = 1;
}
try {
  main();
} catch (error) {
  process.stderr.write((error instanceof Error ? error.message : '提权助手失败') + os.EOL);
  process.exitCode = 2;
}
