import React, { useState, useEffect, useRef } from 'react';
import { Package, Play, AlertCircle, CheckCircle, Loader, XCircle } from 'lucide-react';
import { useEnvStore } from '../store/envStore';
import { envguardApi } from '../api/envguard';

interface InstallLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export const DependencyInstall: React.FC = () => {
  const { environments, activeEnvironmentId } = useEnvStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string>(activeEnvironmentId || '');
  const [packageInput, setPackageInput] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installLogs, setInstallLogs] = useState<InstallLog[]>([]);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState<
    'idle' | 'installing' | 'success' | 'error' | 'cancelled'
  >('idle');
  const [operationId, setOperationId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到日志底部
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [installLogs]);

  useEffect(() => {
    return envguardApi.onDependencyInstallProgress((progress) => {
      if (!operationId || progress.operationId !== operationId) return;

      const level: InstallLog['level'] =
        progress.status === 'failed'
          ? 'error'
          : progress.status === 'cancelled'
            ? 'warn'
            : progress.status === 'success'
              ? 'success'
              : 'info';
      setInstallProgress(progress.progress);
      setInstallLogs((logs) => [
        ...logs,
        {
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          level,
          message: progress.error ? `${progress.message}: ${progress.error}` : progress.message,
        },
      ]);
      if (progress.status === 'failed') {
        setInstallStatus('error');
      } else if (progress.status === 'cancelled') {
        setInstallStatus('cancelled');
      }
    });
  }, [operationId]);

  // 获取当前选中的环境
  const currentEnv = environments.find((e) => e.id === selectedEnvId);

  // 添加日志
  const addLog = (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void => {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    setInstallLogs((prev) => [...prev, { timestamp, level, message }]);
  };

  // 开始安装
  const handleInstall = async (): Promise<void> => {
    if (!selectedEnvId || !packageInput.trim()) {
      addLog('请选择环境并输入包名', 'error');
      return;
    }

    if (!currentEnv) {
      addLog('环境信息不完整', 'error');
      return;
    }

    const currentOperationId = `dependency-install-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOperationId(currentOperationId);
    setInstalling(true);
    setInstallStatus('installing');
    setInstallLogs([]);
    setInstallProgress(0);

    try {
      addLog(`开始安装依赖: ${packageInput}`, 'info');
      addLog(`目标环境: ${currentEnv.name}`, 'info');

      // 解析包名列表
      const packages = packageInput
        .split(/[\s\n]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      // 调用安装 API
      const result = await envguardApi.installDependency(
        currentEnv.path,
        currentEnv.type,
        packages,
        currentOperationId
      );

      if (result.success) {
        addLog('依赖安装成功！', 'success');
        setInstallProgress(100);
        setInstallStatus('success');
        setPackageInput('');

        // 安装完成后立即重新扫描并持久化当前环境的依赖列表，避免详情页继续显示旧缓存。
        try {
          const dependencies = await envguardApi.getInstalledPackages(
            currentEnv.path,
            currentEnv.type
          );
          const updatedEnvironment = await envguardApi.updateEnvironment(currentEnv.id, {
            dependencies,
          });
          useEnvStore.getState().updateEnvironment(currentEnv.id, {
            dependencies: updatedEnvironment.dependencies,
            updatedAt: updatedEnvironment.updatedAt,
          });
          addLog('依赖列表已刷新，共 ' + dependencies.length + ' 个依赖', 'info');
        } catch (refreshError) {
          const refreshMessage =
            refreshError instanceof Error ? refreshError.message : '未知刷新错误';
          addLog('安装已成功，但依赖列表刷新失败：' + refreshMessage, 'warn');
        }
      } else if (result.cancelled) {
        addLog(result.message || '安装已取消', 'warn');
        setInstallStatus('cancelled');
      } else {
        addLog(`安装失败: ${result.message || result.error || '未知错误'}`, 'error');
        const failureReasons = result.details?.failureReasons as Record<string, string> | undefined;
        if (failureReasons) {
          Object.entries(failureReasons).forEach(([pkg, reason]) => {
            addLog(`${pkg} 失败分类: ${reason}`, 'warn');
          });
        }
        if (result.details?.consistencyVerified === false) {
          addLog('安装后依赖清单未能确认完整一致，请重新扫描环境。', 'warn');
        }
        setInstallStatus('error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '安装过程中出错';
      addLog(errorMsg, 'error');
      setInstallStatus('error');
    } finally {
      setInstalling(false);
      setOperationId(null);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!operationId) return;
    try {
      await envguardApi.cancelDependencyInstall(operationId);
      addLog('已发送取消请求，正在终止安装进程...', 'warn');
    } catch (error) {
      addLog(error instanceof Error ? error.message : '取消安装失败', 'error');
    }
  };

  // 清空日志
  const handleClearLogs = (): void => {
    setInstallLogs([]);
    setInstallProgress(0);
    setInstallStatus('idle');
  };

  // 获取日志颜色
  const getLogColor = (level: string): string => {
    switch (level) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">给环境安装依赖</h1>
          <p className="max-w-3xl text-slate-400">
            选择一个已经存在的 Python、Node、Go 或 Java 环境，然后追加安装包。它不会新建环境；
            新环境请从左侧“新建环境”进入，查看已安装包请进入环境详情页。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：安装配置 */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-white mb-6">安装配置</h2>

              {/* 环境选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  选择目标环境
                </label>
                <select
                  value={selectedEnvId}
                  onChange={(e) => setSelectedEnvId(e.target.value)}
                  disabled={installing}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">-- 选择环境 --</option>
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({env.type} {env.version})
                    </option>
                  ))}
                </select>
              </div>

              {/* 环境信息 */}
              {currentEnv && (
                <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
                  <p className="text-sm text-slate-300 mb-2">
                    <span className="font-medium">类型:</span> {currentEnv.type}
                  </p>
                  <p className="text-sm text-slate-300 mb-2">
                    <span className="font-medium">版本:</span> {currentEnv.version}
                  </p>
                  <p className="text-sm text-slate-300 mb-2">
                    <span className="font-medium">路径:</span>
                    <br />
                    <code className="text-xs bg-slate-800 p-1 rounded mt-1 block break-all">
                      {currentEnv.path}
                    </code>
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="font-medium">状态:</span>
                    <span
                      className={`ml-2 inline-block px-2 py-1 rounded text-xs font-medium ${
                        currentEnv.status === 'healthy'
                          ? 'bg-green-900 text-green-200'
                          : currentEnv.status === 'warning'
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {currentEnv.status === 'healthy'
                        ? '正常'
                        : currentEnv.status === 'warning'
                          ? '警告'
                          : '异常'}
                    </span>
                  </p>
                </div>
              )}

              {/* 包名输入 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  包名或需求描述
                </label>
                <textarea
                  value={packageInput}
                  onChange={(e) => setPackageInput(e.target.value)}
                  disabled={installing}
                  placeholder="例如: numpy pandas scikit-learn&#10;或: 我需要数据分析库"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none h-24"
                />
                <p className="text-xs text-slate-400 mt-2">
                  支持多个包名（用空格或换行分隔）或自然语言描述
                </p>
              </div>

              {/* 安装按钮 */}
              <button
                onClick={handleInstall}
                disabled={installing || !selectedEnvId || !packageInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {installing ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    安装中...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    开始安装
                  </>
                )}
              </button>
              {installing && (
                <button
                  onClick={() => void handleCancel()}
                  className="w-full mt-3 bg-amber-700 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={18} />
                  取消安装
                </button>
              )}

              {/* 清空日志按钮 */}
              {installLogs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  disabled={installing}
                  className="w-full mt-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  清空日志
                </button>
              )}
            </div>
          </div>

          {/* 右侧：安装日志 */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">安装日志</h2>

              {/* 进度条 */}
              {installing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">安装进度</span>
                    <span className="text-sm text-slate-400">{installProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${installProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 状态指示 */}
              {installStatus !== 'idle' && (
                <div
                  className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    installStatus === 'success'
                      ? 'bg-green-900 text-green-200'
                      : installStatus === 'error'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-blue-900 text-blue-200'
                  }`}
                >
                  {installStatus === 'success' ? (
                    <CheckCircle size={20} />
                  ) : installStatus === 'error' ? (
                    <AlertCircle size={20} />
                  ) : (
                    <Loader size={20} className="animate-spin" />
                  )}
                  <span className="text-sm font-medium">
                    {installStatus === 'success'
                      ? '安装成功'
                      : installStatus === 'error'
                        ? '安装失败'
                        : installStatus === 'cancelled'
                          ? '安装已取消'
                          : '安装中...'}
                  </span>
                </div>
              )}

              {/* 日志输出 */}
              <div className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                {installLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-12">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p>暂无日志</p>
                  </div>
                ) : (
                  installLogs.map((log, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <span className={`ml-2 ${getLogColor(log.level)}`}>{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>

              {/* 提示信息 */}
              <div className="mt-4 p-3 bg-slate-700 rounded-lg text-sm text-slate-300">
                <p className="mb-2">
                  <span className="font-medium">💡 提示:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>安装过程中请勿关闭应用</li>
                  <li>大型依赖包可能需要较长时间</li>
                  <li>安装完成后会自动刷新环境信息</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyInstall;
