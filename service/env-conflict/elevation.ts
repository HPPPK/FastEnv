/**
 * Cross-platform elevation flows.
 *
 * The probe below is intentionally no-op. System PATH writes use a separate,
 * one-shot helper with a strict JSON protocol and a platform whitelist.
 */

import { execFile, execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ElevationRequestResult } from '../../src/types';
import { capturePlatformEnvironment } from './platform-backup';
import {
  ELEVATED_SYSTEM_PATH_OPERATION,
  ELEVATION_PROTOCOL_VERSION,
  mergePathEntries,
  validateElevatedSystemPathRequest,
  type ElevatedSystemPathRequest,
  type ElevatedSystemPathResult,
} from './elevation-protocol';

function requestWindowsElevation(): void {
  const command =
    "$p=Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','exit','0' -Verb RunAs -Wait -PassThru; exit $p.ExitCode";
  const encodedCommand = Buffer.from(command, 'utf16le').toString('base64');
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand],
    { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

function requestMacElevation(): void {
  execFileSync(
    '/usr/bin/osascript',
    ['-e', 'do shell script "true" with administrator privileges'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

function requestLinuxElevation(): void {
  execFileSync('pkexec', ['/usr/bin/true'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function requestEnvironmentElevation(): ElevationRequestResult {
  try {
    if (process.platform === 'win32') requestWindowsElevation();
    else if (process.platform === 'darwin') requestMacElevation();
    else if (process.platform === 'linux') requestLinuxElevation();
    else
      return {
        platform: process.platform,
        success: false,
        requiresRestart: false,
        message: '当前平台暂不支持标准提权请求。',
      };
    return {
      platform: process.platform,
      success: true,
      requiresRestart: true,
      message:
        '授权检查已完成。当前 Electron 进程不会自动获得持久提权；系统级写入需要由受控的一次性提权助手执行。',
    };
  } catch (error) {
    return {
      platform: process.platform,
      success: false,
      requiresRestart: false,
      message:
        error instanceof Error ? '用户取消或提权失败：' + error.message : '用户取消或提权失败。',
    };
  }
}

function shellQuote(value: string): string {
  if (value.includes('\0') || value.includes('\n') || value.includes('\r'))
    throw new Error('提权助手路径包含控制字符');
  return "'" + value.replace(/'/g, "'\"'\"'") + "'";
}

function powershellQuote(value: string): string {
  if (value.includes("'") || /[\r\n\0]/.test(value)) throw new Error('提权助手路径包含未授权字符');
  return "'" + value.replace(/'/g, "''") + "'";
}

function runAsync(file: string, args: string[], timeout = 110000): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout }, (error, _stdout, stderr) => {
      if (!error) {
        resolve();
        return;
      }
      const detail = typeof stderr === 'string' && stderr.trim() ? ': ' + stderr.trim() : '';
      error.message += detail;
      reject(error);
    });
  });
}

function createOperationDirectory(): string {
  const backupRoot = path.join(os.homedir(), '.envguard', 'backups');
  const operationPath = path.join(
    backupRoot,
    'elevated-system-path-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8)
  );
  fs.mkdirSync(operationPath, { recursive: true });
  return operationPath;
}

function getWindowsHelperPath(): string {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'elevation-helper.ps1'),
    path.join(process.cwd(), 'service', 'env-conflict', 'elevation-helper.ps1'),
  ];
  const helperPath = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!helperPath) throw new Error('Windows PowerShell 提权助手未随应用安装。');
  return helperPath;
}

function getNodeHelperPath(): string {
  const candidates = [
    path.join(
      process.resourcesPath ?? '',
      'app.asar.unpacked',
      'dist',
      'service',
      'env-conflict',
      'elevation-helper.js'
    ),
    path.join(__dirname, 'elevation-helper.js'),
  ];
  const helperPath = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!helperPath) throw new Error('提权助手未随应用安装，请重新构建或安装完整版本。');
  return helperPath;
}

async function invokeWindowsHelper(
  helperPath: string,
  requestPath: string,
  resultPath: string,
  requestHash: string
): Promise<void> {
  const powershellPath = path.join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  );
  const helperArguments = [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    helperPath,
    requestPath,
    resultPath,
    requestHash,
  ];
  const command =
    '$p=Start-Process -FilePath ' +
    powershellQuote(powershellPath) +
    ' -ArgumentList @(' +
    helperArguments.map(powershellQuote).join(',') +
    ') -Verb RunAs -Wait -PassThru; exit [int]$p.ExitCode;';
  const encodedCommand = Buffer.from(command, 'utf16le').toString('base64');
  await runAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-EncodedCommand',
    encodedCommand,
  ]);
}

async function invokeMacHelper(
  executable: string,
  helperPath: string,
  requestPath: string,
  resultPath: string,
  requestHash: string
): Promise<void> {
  const command = [
    '/usr/bin/env',
    'ELECTRON_RUN_AS_NODE=1',
    executable,
    helperPath,
    requestPath,
    resultPath,
    requestHash,
  ]
    .map(shellQuote)
    .join(' ');
  const script = 'do shell script ' + JSON.stringify(command) + ' with administrator privileges';
  await runAsync('/usr/bin/osascript', ['-e', script]);
}

async function invokeLinuxHelper(
  executable: string,
  helperPath: string,
  requestPath: string,
  resultPath: string,
  requestHash: string
): Promise<void> {
  await runAsync('pkexec', [
    '/usr/bin/env',
    'ELECTRON_RUN_AS_NODE=1',
    executable,
    helperPath,
    requestPath,
    resultPath,
    requestHash,
  ]);
}

function validateResult(value: unknown, requestId: string): ElevatedSystemPathResult {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('提权助手返回格式无效');
  const result = value as Partial<ElevatedSystemPathResult>;
  if (
    result.version !== ELEVATION_PROTOCOL_VERSION ||
    result.operation !== ELEVATED_SYSTEM_PATH_OPERATION ||
    result.requestId !== requestId ||
    typeof result.success !== 'boolean' ||
    typeof result.changed !== 'boolean' ||
    typeof result.rolledBack !== 'boolean' ||
    typeof result.target !== 'string' ||
    typeof result.message !== 'string'
  )
    throw new Error('提权助手返回未通过校验');
  return result as ElevatedSystemPathResult;
}

export async function writeSystemPathWithElevation(
  pathEntries: string[]
): Promise<ElevatedSystemPathResult> {
  const entries = Array.from(new Set(pathEntries.map((entry) => entry.trim()).filter(Boolean)));
  const operationPath = createOperationDirectory();
  const requestId = 'elevated-' + crypto.randomUUID();
  const request: ElevatedSystemPathRequest = {
    version: ELEVATION_PROTOCOL_VERSION,
    operation: ELEVATED_SYSTEM_PATH_OPERATION,
    requestId,
    platform: process.platform as ElevatedSystemPathRequest['platform'],
    pathEntries: entries,
    backupPath: operationPath,
  };
  validateElevatedSystemPathRequest(request);
  fs.writeFileSync(
    path.join(operationPath, 'environment.json'),
    JSON.stringify(capturePlatformEnvironment(), null, 2),
    'utf8'
  );
  const requestPath = path.join(operationPath, 'request.json');
  const resultPath = path.join(operationPath, 'result.json');
  const requestContent = JSON.stringify(request, null, 2);
  fs.writeFileSync(requestPath, requestContent, { encoding: 'utf8', mode: 0o600 });
  const requestHash = crypto.createHash('sha256').update(requestContent, 'utf8').digest('hex');
  try {
    if (process.platform === 'win32')
      await invokeWindowsHelper(getWindowsHelperPath(), requestPath, resultPath, requestHash);
    else if (process.platform === 'darwin' || process.platform === 'linux') {
      const helperPath = getNodeHelperPath();
      if (process.platform === 'darwin')
        await invokeMacHelper(process.execPath, helperPath, requestPath, resultPath, requestHash);
      else
        await invokeLinuxHelper(process.execPath, helperPath, requestPath, resultPath, requestHash);
    } else throw new Error('当前平台不支持系统级 PATH 提权写入。');
  } catch (error) {
    if (fs.existsSync(resultPath)) {
      const result = validateResult(
        JSON.parse(fs.readFileSync(resultPath, 'utf8')) as unknown,
        requestId
      );
      return { ...result, cancelled: false };
    }
    return {
      version: ELEVATION_PROTOCOL_VERSION,
      operation: ELEVATED_SYSTEM_PATH_OPERATION,
      requestId,
      platform: process.platform,
      success: false,
      changed: false,
      rolledBack: false,
      cancelled: true,
      target:
        process.platform === 'win32'
          ? 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment\\Path'
          : process.platform === 'darwin'
            ? '/etc/paths.d/envguard'
            : '/etc/profile.d/envguard.sh',
      backupPath: operationPath,
      message:
        '用户取消授权或提权助手未能启动：' + (error instanceof Error ? error.message : '未知错误'),
      errorCode: 'ELEVATION_CANCELLED',
    };
  }
  if (!fs.existsSync(resultPath)) throw new Error('提权助手未返回结果文件');
  const result = validateResult(
    JSON.parse(fs.readFileSync(resultPath, 'utf8')) as unknown,
    requestId
  );
  if (result.success)
    process.env.PATH = mergePathEntries(process.env.PATH ?? '', entries, path.delimiter);
  return { ...result, cancelled: false };
}
