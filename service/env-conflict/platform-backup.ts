/**
 * Cross-platform environment snapshot helpers.
 *
 * This module only captures and restores the current process environment. It records
 * persistent configuration sources for an auditable backup, but never mutates the OS by itself.
 */

import { execFileSync } from 'child_process';
import fsSync from 'fs';
import os from 'os';
import pathSync from 'path';

export type PlatformBackupSourceKind = 'windows-registry' | 'shell-profile';

export interface PlatformBackupSource {
  kind: PlatformBackupSourceKind;
  target: string;
  exists: boolean;
  content?: string;
  error?: string;
}

export interface PlatformEnvironmentSnapshot {
  platform: NodeJS.Platform;
  capturedAt: string;
  processEnv: Record<string, string>;
  sources: PlatformBackupSource[];
}

interface PlatformBackupTarget {
  kind: PlatformBackupSourceKind;
  target: string;
}

/**
 * Return the persistent configuration sources relevant to a platform.
 * macOS and Linux use user shell profiles; Windows uses the user and machine
 * environment registry keys. The targets are data only and are not modified here.
 */
export function getPlatformEnvironmentTargets(
  platform: NodeJS.Platform = process.platform
): PlatformBackupTarget[] {
  if (platform === 'win32') {
    return [
      { kind: 'windows-registry', target: 'HKCU\\Environment' },
      {
        kind: 'windows-registry',
        target: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment',
      },
    ];
  }

  const home = os.homedir();
  const profileNames =
    platform === 'darwin'
      ? ['.zprofile', '.zshrc', '.zshenv', '.bash_profile', '.bashrc', '.profile']
      : ['.profile', '.bash_profile', '.bashrc', '.zprofile', '.zshrc'];

  return profileNames.map((name) => ({
    kind: 'shell-profile' as const,
    target: pathSync.join(home, name),
  }));
}

function captureSource(target: PlatformBackupTarget): PlatformBackupSource {
  try {
    if (target.kind === 'windows-registry') {
      const content = execFileSync('reg.exe', ['query', target.target], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { ...target, exists: true, content };
    }

    if (!fsSync.existsSync(target.target)) {
      return { ...target, exists: false };
    }

    return {
      ...target,
      exists: true,
      content: fsSync.readFileSync(target.target, 'utf8'),
    };
  } catch (error) {
    return {
      ...target,
      exists: false,
      error: error instanceof Error ? error.message : 'Unable to read backup source',
    };
  }
}

export function capturePlatformEnvironment(): PlatformEnvironmentSnapshot {
  const processEnv = Object.entries(process.env).reduce<Record<string, string>>(
    (result, [key, value]) => {
      if (value !== undefined) result[key] = value;
      return result;
    },
    {}
  );

  return {
    platform: process.platform,
    capturedAt: new Date().toISOString(),
    processEnv,
    sources: getPlatformEnvironmentTargets().map(captureSource),
  };
}

/** Restore only the current Node process environment from a snapshot. */
export function restoreProcessEnvironment(snapshot: PlatformEnvironmentSnapshot): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot.processEnv)) delete process.env[key];
  }

  for (const [key, value] of Object.entries(snapshot.processEnv)) {
    process.env[key] = value;
  }
}

export interface PersistentPathState {
  kind: PlatformBackupSourceKind;
  target: string;
  exists: boolean;
  value: string;
  originalContent?: string;
}

export interface PersistentPathChange {
  kind: PlatformBackupSourceKind;
  target: string;
  previousExists: boolean;
  previousValue: string;
  previousContent?: string;
}

const ENVGUARD_PATH_START = '# >>> EnvGuard managed PATH >>>';
const ENVGUARD_PATH_END = '# <<< EnvGuard managed PATH <<<';

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$*+?.()|[\\]{}]/g, '\\$&');
}

function getPersistentPathTargets(platform: NodeJS.Platform): PlatformBackupTarget[] {
  return getPlatformEnvironmentTargets(platform).filter(
    (target) => target.kind === 'shell-profile' || target.target === 'HKCU\\Environment'
  );
}

function parseWindowsUserPath(): PersistentPathState {
  const target = { kind: 'windows-registry' as const, target: 'HKCU\\Environment' };
  try {
    const output = execFileSync('reg.exe', ['query', target.target, '/v', 'PATH'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const match = output.match(/^\s*PATH\s+REG_\S+\s+(.*)$/im);
    return {
      ...target,
      exists: Boolean(match),
      value: match?.[1]?.trim() ?? process.env.PATH ?? '',
      originalContent: output,
    };
  } catch {
    return { ...target, exists: false, value: process.env.PATH ?? '' };
  }
}

function getProfilePathValue(content: string): string | null {
  const managedPattern = new RegExp(
    escapeRegExp(ENVGUARD_PATH_START) +
      '\\r?\\nexport PATH=(.*)\\r?\\n' +
      escapeRegExp(ENVGUARD_PATH_END)
  );
  const managed = content.match(managedPattern);
  if (managed?.[1]) {
    return managed[1].trim().replace(/^"|"$/g, '');
  }

  const exportLine = content.match(/^\s*export\s+PATH=(?:"([^"]*)"|'([^']*)'|([^\s#]+))/m);
  return exportLine?.[1] ?? exportLine?.[2] ?? exportLine?.[3] ?? null;
}

function selectShellProfile(): PersistentPathState {
  const targets = getPersistentPathTargets(process.platform);
  const fallback = targets.find((target) => target.kind === 'shell-profile');
  for (const target of targets) {
    if (target.kind !== 'shell-profile' || !fsSync.existsSync(target.target)) continue;
    const content = fsSync.readFileSync(target.target, 'utf8');
    const value = getProfilePathValue(content);
    if (value !== null) {
      return { ...target, exists: true, value, originalContent: content };
    }
    if (fallback?.target === target.target) {
      return { ...target, exists: true, value: process.env.PATH ?? '', originalContent: content };
    }
  }

  if (!fallback) {
    throw new Error('未找到可用的 Shell 配置文件');
  }
  const originalContent = fsSync.existsSync(fallback.target)
    ? fsSync.readFileSync(fallback.target, 'utf8')
    : undefined;
  return {
    ...fallback,
    exists: originalContent !== undefined,
    value: process.env.PATH ?? '',
    originalContent,
  };
}

export function readPersistentPath(): PersistentPathState {
  if (process.platform === 'win32') return parseWindowsUserPath();
  return selectShellProfile();
}

function assertSafePersistentTarget(state: PersistentPathState): void {
  if (state.kind === 'windows-registry') {
    if (state.target !== 'HKCU\\Environment') {
      throw new Error('仅允许修改当前用户的 Windows 环境变量');
    }
    return;
  }

  const home = os.homedir() + pathSync.sep;
  if (!state.target.startsWith(home)) {
    throw new Error('仅允许修改当前用户目录下的 Shell 配置文件');
  }
}

function writeAtomic(filePath: string, content: string, mode?: number): void {
  const temporaryPath = filePath + '.envguard-' + process.pid + '-' + Date.now() + '.tmp';
  fsSync.writeFileSync(temporaryPath, content, { encoding: 'utf8', mode });
  fsSync.renameSync(temporaryPath, filePath);
}

export function updatePersistentPath(
  state: PersistentPathState,
  nextPath: string,
  backupPath: string
): PersistentPathChange {
  assertSafePersistentTarget(state);
  const change: PersistentPathChange = {
    kind: state.kind,
    target: state.target,
    previousExists: state.exists,
    previousValue: state.value,
    previousContent: state.originalContent,
  };

  if (state.kind === 'windows-registry') {
    execFileSync(
      'reg.exe',
      ['add', state.target, '/v', 'PATH', '/t', 'REG_EXPAND_SZ', '/d', nextPath, '/f'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } else {
    const currentContent = state.originalContent ?? '';
    const managedBlock =
      ENVGUARD_PATH_START +
      '\nexport PATH="' +
      nextPath.replace(/"/g, '\\"') +
      '"\n' +
      ENVGUARD_PATH_END +
      '\n';
    const managedPattern = new RegExp(
      escapeRegExp(ENVGUARD_PATH_START) +
        '[\\s\\S]*?' +
        escapeRegExp(ENVGUARD_PATH_END) +
        '\\r?\\n?',
      'm'
    );
    const trimmedContent = currentContent.trimEnd();
    const nextContent = managedPattern.test(currentContent)
      ? currentContent.replace(managedPattern, managedBlock)
      : trimmedContent + (trimmedContent ? '\n\n' : '') + managedBlock;
    fsSync.mkdirSync(pathSync.dirname(state.target), { recursive: true });
    writeAtomic(
      state.target,
      nextContent,
      state.exists ? fsSync.statSync(state.target).mode : undefined
    );
  }

  const changesFile = pathSync.join(backupPath, 'persistent-path-changes.json');
  const previousChanges = fsSync.existsSync(changesFile)
    ? (JSON.parse(fsSync.readFileSync(changesFile, 'utf8')) as PersistentPathChange[])
    : [];
  fsSync.writeFileSync(changesFile, JSON.stringify([...previousChanges, change], null, 2), 'utf8');
  return change;
}

export function restorePersistentPath(change: PersistentPathChange): void {
  const state: PersistentPathState = {
    kind: change.kind,
    target: change.target,
    exists: change.previousExists,
    value: change.previousValue,
    originalContent: change.previousContent,
  };
  assertSafePersistentTarget(state);

  if (change.kind === 'windows-registry') {
    if (change.previousExists) {
      execFileSync(
        'reg.exe',
        [
          'add',
          change.target,
          '/v',
          'PATH',
          '/t',
          'REG_EXPAND_SZ',
          '/d',
          change.previousValue,
          '/f',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } else {
      try {
        execFileSync('reg.exe', ['delete', change.target, '/v', 'PATH', '/f'], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch {
        // The value may already be absent; rollback remains idempotent.
      }
    }
    return;
  }

  if (change.previousExists && change.previousContent !== undefined) {
    writeAtomic(change.target, change.previousContent);
  } else if (!change.previousExists && fsSync.existsSync(change.target)) {
    fsSync.unlinkSync(change.target);
  }
}
