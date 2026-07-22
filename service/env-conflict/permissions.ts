/**
 * Cross-platform permission preflight for environment configuration changes.
 * This module performs read-only checks and never changes user or system state.
 */

import { execFileSync } from 'child_process';
import fsSync from 'fs';
import os from 'os';
import pathSync from 'path';
import type { EnvironmentPermissionStatus } from '../../src/types';
import { getPlatformEnvironmentTargets } from './platform-backup';

function isElevated(): boolean {
  if (process.platform === 'win32') {
    try {
      const output = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          '([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)',
        ],
        { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
      );
      return output.trim().toLowerCase() === 'true';
    } catch {
      return false;
    }
  }

  return typeof process.getuid === 'function' && process.getuid() === 0;
}

function getUserPathTarget(): string {
  const targets = getPlatformEnvironmentTargets(process.platform);
  const target = targets.find((item) => item.kind === 'windows-registry');
  if (target) return target.target;
  const existingProfile = targets.find(
    (item) => item.kind === 'shell-profile' && fsSync.existsSync(item.target)
  );
  return existingProfile?.target ?? targets[0]?.target ?? os.homedir();
}

function checkShellProfileWritable(target: string): boolean {
  try {
    if (fsSync.existsSync(target)) {
      fsSync.accessSync(target, fsSync.constants.W_OK);
      return true;
    }
    fsSync.accessSync(pathSync.dirname(target), fsSync.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function getEnvironmentPermissionStatus(): EnvironmentPermissionStatus {
  const elevated = isElevated();
  const userTarget = getUserPathTarget();
  const userWritable = process.platform === 'win32' ? true : checkShellProfileWritable(userTarget);
  const systemTarget =
    process.platform === 'win32'
      ? 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
      : process.platform === 'darwin'
        ? '/etc/paths and launchd environment'
        : '/etc/environment and shell system profiles';

  return {
    platform: process.platform,
    isElevated: elevated,
    userPath: {
      writable: userWritable,
      target: userTarget,
      message: userWritable
        ? '当前用户级 PATH 可以尝试写入；如果被组策略或文件权限拒绝，修复结果会保留具体错误。'
        : '当前用户 Shell 配置文件不可写，请检查文件权限或选择其他用户配置文件。',
    },
    systemPath: {
      writable: elevated,
      target: systemTarget,
      requiresElevation: true,
      message: elevated
        ? '当前进程具备管理员/root 权限，但系统级写入仍需单独确认。'
        : '系统级环境变量需要管理员/root 权限；当前版本不会自动请求提权。',
    },
  };
}
