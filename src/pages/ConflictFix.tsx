import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Zap, RefreshCw, Download, Upload } from 'lucide-react';
import { useEnvStore } from '../store/envStore';
import { envguardApi } from '../api/envguard';

interface ConflictItem {
  id: string;
  type: 'version' | 'path' | 'dependency' | 'config' | 'permission';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedItems: string[];
  suggestedFix: string;
}

export const ConflictFix: React.FC = () => {
  const { environments } = useEnvStore();
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [repairResult, setRepairResult] = useState<any>(null);
  const [uploadedLog, setUploadedLog] = useState<string>('');
  const [showRepairPreview, setShowRepairPreview] = useState(false);

  // 扫描冲突
  const handleScanConflicts = async () => {
    setLoading(true);
    try {
      const result = await envguardApi.detectConflicts();
      if (result && Array.isArray(result)) {
        setConflicts(result);
      } else {
        setConflicts([]);
      }
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  };

  // 一键修复
  const handleAutoRepair = async () => {
    setRepairing(true);
    try {
      const result = await envguardApi.fixConflicts();
      setRepairResult(result);
      // 修复完成后重新扫描
      setTimeout(() => {
        handleScanConflicts();
      }, 1000);
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
  const handleLogUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadedLog(content);
        // 可以在这里调用 API 分析日志中的冲突
      };
      reader.readAsText(file);
    }
  };

  // 获取冲突严重程度的颜色
  const getSeverityColor = (severity: string) => {
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
  const getSeverityIconColor = (severity: string) => {
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
                onClick={handleScanConflicts}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                {loading ? '扫描中...' : '开始扫描'}
              </button>
              <p className="text-sm text-slate-400">
                系统将扫描 PATH 环境变量、虚拟环境、依赖版本等潜在冲突
              </p>
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
              <input
                type="file"
                onChange={handleLogUpload}
                className="hidden"
                accept=".log,.txt"
              />
            </label>
          </div>
        </div>

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
              repairResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
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
                  <p className="text-sm text-slate-700 mt-2">
                    备份路径：{repairResult.backupPath}
                  </p>
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
              onClick={handleAutoRepair}
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
      </div>
    </div>
  );
};

export default ConflictFix;
