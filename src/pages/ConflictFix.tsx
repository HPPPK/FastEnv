import { useEffect, useState, type ChangeEvent, type FC } from 'react';
import { AlertCircle, CheckCircle, Zap, RefreshCw, Download, Upload } from 'lucide-react';
import { envguardApi } from '../api/envguard';
import type {
  ElevationRequestResult,
  ElevatedSystemPathResult,
  EnvironmentConflict,
  EnvironmentPermissionStatus,
  RepairRecord,
} from '../types';

interface ConflictItem {
  id: string;
  type: 'version' | 'path' | 'dependency' | 'config' | 'permission';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedItems: string[];
  suggestedFix: string;
  autoFixable: boolean;
}

export const ConflictFix: FC = () => {
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<EnvironmentPermissionStatus | null>(
    null
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [elevationRequesting, setElevationRequesting] = useState(false);
  const [elevationResult, setElevationResult] = useState<ElevationRequestResult | null>(null);
  const [systemPathInput, setSystemPathInput] = useState('');
  const [systemPathConfirmed, setSystemPathConfirmed] = useState(false);
  const [systemPathWriting, setSystemPathWriting] = useState(false);
  const [systemPathResult, setSystemPathResult] = useState<ElevatedSystemPathResult | null>(null);
  const [repairResult, setRepairResult] = useState<{
    success: boolean;
    message?: string;
    fixedConflicts?: string[];
    failedConflicts?: string[];
    backupPath?: string;
    repairRecord?: unknown;
  } | null>(null);
  const [showRepairPreview, setShowRepairPreview] = useState(false);
  const [repairConfirmed, setRepairConfirmed] = useState(false);

  useEffect(() => {
    void envguardApi
      .getEnvironmentPermissionStatus()
      .then((status) => {
        setPermissionStatus(status);
        setPermissionError(null);
      })
      .catch((error: unknown) => {
        setPermissionError(error instanceof Error ? error.message : '无法读取权限状态');
      });
  }, []);

  // 扫描冲突
  const handleScanConflicts = async (clearRepairResult = true): Promise<void> => {
    setLoading(true);
    setScanError(null);
    try {
      const result = await envguardApi.detectConflicts();
      const normalizedConflicts = result.conflicts.map(
        (conflict: EnvironmentConflict): ConflictItem => ({
          id: conflict.id,
          type: conflict.type.includes('path')
            ? 'path'
            : conflict.type.includes('version')
              ? 'version'
              : conflict.type.includes('dependency')
                ? 'dependency'
                : conflict.type.includes('permission')
                  ? 'permission'
                  : 'config',
          severity:
            conflict.severity === 'critical'
              ? 'critical'
              : conflict.severity === 'high' || conflict.severity === 'medium'
                ? 'warning'
                : 'info',
          title: conflict.type.replace(/[-_]/g, ' '),
          description: conflict.description,
          affectedItems: conflict.affectedEnvironments,
          suggestedFix: conflict.suggestedFix ?? conflict.suggestion ?? '请查看修复记录后再处理。',
          autoFixable: conflict.autoFixable === true,
        })
      );
      setConflicts(normalizedConflicts);
      if (clearRepairResult) {
        setRepairResult(null);
      }
      setRepairConfirmed(false);
      setShowRepairPreview(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '冲突扫描失败';
      setScanError(message);
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestElevation = async (): Promise<void> => {
    setElevationRequesting(true);
    try {
      const result = await envguardApi.requestEnvironmentElevation();
      setElevationResult(result);
      if (result.success) {
        const refreshed = await envguardApi.getEnvironmentPermissionStatus();
        setPermissionStatus(refreshed);
      }
    } catch (error) {
      setElevationResult({
        platform: permissionStatus?.platform ?? ('unknown' as NodeJS.Platform),
        success: false,
        requiresRestart: false,
        message: error instanceof Error ? error.message : '提权请求失败',
      });
    } finally {
      setElevationRequesting(false);
    }
  };

  const handleWriteSystemPath = async (): Promise<void> => {
    const entries = systemPathInput
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!systemPathConfirmed || entries.length === 0) return;
    setSystemPathWriting(true);
    setSystemPathResult(null);
    try {
      const result = await envguardApi.writeSystemPathWithElevation(entries);
      setSystemPathResult(result);
      if (result.success) {
        setSystemPathConfirmed(false);
        const refreshed = await envguardApi.getEnvironmentPermissionStatus();
        setPermissionStatus(refreshed);
      }
    } catch (error) {
      setSystemPathResult({
        version: 1,
        operation: 'write-system-path',
        requestId: 'ui-error',
        platform: permissionStatus?.platform ?? 'unknown',
        success: false,
        changed: false,
        rolledBack: false,
        target: permissionStatus?.systemPath.target ?? 'system PATH',
        message: error instanceof Error ? error.message : '系统级 PATH 写入失败',
        errorCode: 'IPC_ERROR',
      });
    } finally {
      setSystemPathWriting(false);
    }
  };

  // 一键修复
  const handleAutoRepair = async (): Promise<void> => {
    if (permissionStatus && !permissionStatus.userPath.writable) {
      setRepairResult({
        success: false,
        message: permissionStatus.userPath.message,
        fixedConflicts: [],
        failedConflicts: [],
      });
      return;
    }

    setRepairing(true);
    try {
      const result = await envguardApi.fixConflicts();
      const record = result.repairRecord as RepairRecord;
      const fixedConflicts = record.changes.map((change) =>
        typeof change === 'string' ? change : change.description
      );
      setRepairResult({
        success: result.success,
        message:
          record.errorMessage ??
          (result.success
            ? `修复完成：记录了 ${fixedConflicts.length} 项配置变更。`
            : `修复未完全成功，当前状态：${record.status}`),
        fixedConflicts,
        failedConflicts:
          record.status === 'partial' || record.status === 'failed'
            ? record.logs.filter((log) => log.includes('失败'))
            : [],
        backupPath: record.backupPath,
        repairRecord: record,
      });
      setRepairConfirmed(false);
      // 修复完成后立即重新扫描，避免页面继续显示已处理的旧冲突。
      await handleScanConflicts(false);
    } catch (error) {
      console.error('Failed to repair conflicts:', error);
      setRepairResult({
        success: false,
        message: '修复失败，请查看日志了解详情',
        fixedConflicts: [],
        failedConflicts: [],
      });
    } finally {
      setRepairing(false);
    }
  };

  // 处理日志上传
  const handleLogUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: 接入日志内容解析 IPC。
      void file;
    }
  };

  // 获取冲突严重程度的颜色
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // 获取冲突严重程度的图标颜色
  const getSeverityIconColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">环境冲突检测与修复</h1>
          <p className="text-slate-400">智能扫描系统环境冲突，一键自动修复</p>
        </div>

        {/* 操作区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 扫描区域 */}
          <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">冲突扫描</h2>
            <div className="space-y-4">
              <button
                onClick={() => void handleScanConflicts()}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                {loading ? '扫描中...' : '开始扫描'}
              </button>
              <p className="text-sm text-slate-400">
                系统将扫描 PATH 环境变量、虚拟环境、依赖版本等潜在冲突
              </p>
              {permissionStatus && (
                <div className="rounded border border-slate-600 bg-slate-900/60 p-3 text-xs text-slate-300">
                  <p>
                    当前用户级 PATH：{permissionStatus.userPath.writable ? '可尝试写入' : '不可写'}
                  </p>
                  <p className="mt-1">系统级环境变量：{permissionStatus.systemPath.message}</p>{' '}
                  {!permissionStatus.systemPath.writable && (
                    <button
                      type="button"
                      onClick={() => void handleRequestElevation()}
                      disabled={elevationRequesting}
                      className="mt-2 rounded border border-yellow-600 px-2 py-1 text-yellow-200 hover:bg-yellow-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {elevationRequesting ? '等待系统授权...' : '请求管理员权限（仅验证）'}
                    </button>
                  )}
                  {elevationResult && (
                    <p
                      className={`mt-2 ${elevationResult.success ? 'text-green-300' : 'text-red-300'}`}
                    >
                      {elevationResult.message}
                    </p>
                  )}
                  <div className="mt-4 border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-400">
                      需要写入系统级 PATH
                      时，应用只会调用白名单操作，并在一次性管理员授权后退出助手。
                    </p>
                    <textarea
                      value={systemPathInput}
                      onChange={(event) => setSystemPathInput(event.target.value)}
                      placeholder="每行一个绝对路径，例如：C:\\Tools\\Python\\Scripts"
                      rows={3}
                      className="mt-2 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                    />
                    <label className="mt-2 flex items-start gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={systemPathConfirmed}
                        onChange={(event) => setSystemPathConfirmed(event.target.checked)}
                      />
                      <span>我确认将上面的目录追加到系统级 PATH，并允许系统弹出管理员授权。</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleWriteSystemPath()}
                      disabled={
                        systemPathWriting ||
                        !systemPathConfirmed ||
                        systemPathInput.trim().length === 0
                      }
                      className="mt-2 rounded border border-red-600 px-2 py-1 text-red-200 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {systemPathWriting ? '写入中...' : '确认写入系统级 PATH'}
                    </button>
                    {systemPathResult && (
                      <p
                        className={`mt-2 text-xs ${systemPathResult.success ? 'text-green-300' : 'text-red-300'}`}
                      >
                        {systemPathResult.message}
                        {systemPathResult.backupPath ? ` 备份：${systemPathResult.backupPath}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {permissionError && (
                <p className="text-xs text-yellow-300">
                  权限预检失败：{permissionError}，修复时仍会返回实际错误。
                </p>
              )}
            </div>
          </div>

          {/* 日志上传区域 */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">上传日志</h2>
            <label className="block">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-slate-500 transition-colors">
                <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-400">点击上传错误日志</p>
              </div>
              <input type="file" onChange={handleLogUpload} className="hidden" accept=".log,.txt" />
            </label>
          </div>
        </div>

        {scanError && (
          <div className="mb-8 flex items-start gap-3 rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-100">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">冲突扫描失败</p>
              <p className="mt-1 text-sm text-red-200">{scanError}</p>
            </div>
          </div>
        )}

        {/* 冲突列表 */}
        {conflicts.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              检测到 {conflicts.length} 个冲突
            </h2>
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(conflict.severity)}`}
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle
                      size={24}
                      className={`flex-shrink-0 mt-1 ${getSeverityIconColor(conflict.severity)}`}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{conflict.title}</h3>
                      <p className="text-sm text-slate-700 mb-2">{conflict.description}</p>
                      <div className="mb-2">
                        <p className="text-xs font-medium text-slate-600 mb-1">受影响项：</p>
                        <div className="flex flex-wrap gap-2">
                          {conflict.affectedItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-slate-200 text-slate-800 text-xs px-2 py-1 rounded"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        建议修复：{conflict.suggestedFix}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 修复结果 */}
        {repairResult && (
          <div
            className={`rounded-lg border p-6 mb-8 ${
              repairResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-4">
              {repairResult.success ? (
                <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold mb-2 ${
                    repairResult.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {repairResult.message}
                </h3>
                {repairResult.fixedConflicts && repairResult.fixedConflicts.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-slate-700 mb-1">已修复：</p>
                    <ul className="text-sm text-slate-700 list-disc list-inside">
                      {repairResult.fixedConflicts.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {repairResult.failedConflicts && repairResult.failedConflicts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">修复失败：</p>
                    <ul className="text-sm text-slate-700 list-disc list-inside">
                      {repairResult.failedConflicts.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {repairResult.backupPath && (
                  <p className="text-sm text-slate-700 mt-2">备份路径：{repairResult.backupPath}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 修复按钮 */}
        {conflicts.length > 0 && !repairResult && (
          <div className="flex gap-4">
            <button
              onClick={() => setShowRepairPreview(true)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download size={20} />
              查看修复方案
            </button>
            <button
              onClick={() => {
                setRepairConfirmed(false);
                setShowRepairPreview(true);
              }}
              disabled={repairing}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={20} className={repairing ? 'animate-spin' : ''} />
              {repairing ? '修复中...' : '一键修复'}
            </button>
          </div>
        )}

        {/* 空状态 */}
        {conflicts.length === 0 && !loading && (
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-600" />
            <h3 className="text-xl font-semibold text-white mb-2">未检测到冲突</h3>
            <p className="text-slate-400">您的环境配置良好，无需修复</p>
          </div>
        )}

        {showRepairPreview && conflicts.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold text-white">修复方案预览</h2>
              <p className="mb-4 text-sm text-slate-300">
                以下操作将由主进程执行。请确认已阅读影响范围；系统修复前会尝试创建备份。
              </p>
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded border border-slate-600 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{conflict.title}</p>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          conflict.autoFixable
                            ? 'bg-green-900/60 text-green-200'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {conflict.autoFixable ? '可自动修复' : '仅提供建议'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{conflict.suggestedFix}</p>
                  </div>
                ))}
              </div>
              <label className="mt-6 flex items-start gap-3 rounded border border-slate-600 p-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={repairConfirmed}
                  onChange={(event) => setRepairConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>我已阅读修复范围，理解这可能修改系统环境配置，并确认继续。</span>
              </label>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRepairConfirmed(false);
                    setShowRepairPreview(false);
                  }}
                  className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-white hover:bg-slate-700"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowRepairPreview(false);
                    void handleAutoRepair();
                  }}
                  disabled={!repairConfirmed || repairing}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  {repairing ? '修复中...' : '确认修复'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictFix;
