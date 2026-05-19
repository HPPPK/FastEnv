/**
 * 修复记录页面
 * 展示所有环境的修复历史记录
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface RepairRecord {
  id: string;
  environmentName: string;
  environmentType: 'python' | 'node' | 'java' | 'go';
  repairType: string;
  status: 'success' | 'failed' | 'partial';
  timestamp: string;
  details: string;
  changesCount: number;
}

export default function RepairRecords(): JSX.Element {
  const [records, setRecords] = useState<RepairRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RepairRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'partial'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载修复记录
    const mockRecords: RepairRecord[] = [
      {
        id: '1',
        environmentName: 'house-price-prediction',
        environmentType: 'python',
        repairType: 'PATH 优先级调整',
        status: 'success',
        timestamp: '2024-05-16 14:30:00',
        details: '自动调整了 Python 版本的 PATH 优先级，解决了版本冲突问题',
        changesCount: 3,
      },
      {
        id: '2',
        environmentName: 'web-app',
        environmentType: 'node',
        repairType: '依赖版本冲突修复',
        status: 'success',
        timestamp: '2024-05-15 10:15:00',
        details: '自动降级了 lodash 到兼容版本，解决了依赖冲突',
        changesCount: 2,
      },
      {
        id: '3',
        environmentName: 'data-analysis',
        environmentType: 'python',
        repairType: '镜像源切换',
        status: 'success',
        timestamp: '2024-05-14 09:45:00',
        details: '切换到国内镜像源，加速依赖下载',
        changesCount: 1,
      },
      {
        id: '4',
        environmentName: 'legacy-project',
        environmentType: 'java',
        repairType: '环境变量重置',
        status: 'partial',
        timestamp: '2024-05-13 16:20:00',
        details: '部分环境变量已重置，但需要手动验证 JAVA_HOME',
        changesCount: 5,
      },
      {
        id: '5',
        environmentName: 'test-env',
        environmentType: 'python',
        repairType: '虚拟环境重建',
        status: 'failed',
        timestamp: '2024-05-12 11:00:00',
        details: '虚拟环境重建失败，权限不足',
        changesCount: 0,
      },
    ];
    setRecords(mockRecords);
    setFilteredRecords(mockRecords);
    setLoading(false);
  }, []);

  useEffect(() => {
    let filtered = records;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.environmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.repairType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    setFilteredRecords(filtered);
  }, [searchTerm, statusFilter, records]);

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
      success: {
        color: 'text-green-500',
        bg: 'bg-green-50',
        label: '成功',
        icon: <CheckCircle size={18} />,
      },
      failed: {
        color: 'text-red-500',
        bg: 'bg-red-50',
        label: '失败',
        icon: <AlertCircle size={18} />,
      },
      partial: {
        color: 'text-yellow-500',
        bg: 'bg-yellow-50',
        label: '部分成功',
        icon: <AlertCircle size={18} />,
      },
    };
    return config[status] || config.success;
  };

  const handleDeleteRecord = (id: string) => {
    setRecords(records.filter((record) => record.id !== id));
  };

  const handleExportRecords = () => {
    const csv = [
      ['环境名称', '环境类型', '修复类型', '状态', '时间', '变更数'],
      ...filteredRecords.map((record) => [
        record.environmentName,
        record.environmentType,
        record.repairType,
        record.status,
        record.timestamp,
        record.changesCount,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">加载修复记录中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">修复记录</h1>
        <p className="mt-2 text-muted-foreground">查看所有环境的修复历史和操作记录</p>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索环境名称或修复类型..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="success">成功</option>
            <option value="partial">部分成功</option>
            <option value="failed">失败</option>
          </select>

          <button
            onClick={handleExportRecords}
            className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 font-medium text-foreground hover:bg-muted"
          >
            <Download size={18} />
            导出
          </button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">暂无修复记录</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const statusConfig = getStatusConfig(record.status);
            return (
              <div
                key={record.id}
                className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg ${statusConfig.bg} p-2`}>{statusConfig.icon}</div>
                      <div>
                        <h3 className="font-semibold text-foreground">{record.environmentName}</h3>
                        <p className="text-sm text-muted-foreground">{record.repairType}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">环境类型: </span>
                        <span className="font-mono text-foreground">{record.environmentType.toUpperCase()}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">时间: </span>
                        <span className="text-foreground">{record.timestamp}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">变更数: </span>
                        <span className="font-semibold text-foreground">{record.changesCount}</span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">{record.details}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="rounded-lg border border-input bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 统计信息 */}
      {filteredRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">总修复次数</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{records.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">成功率</p>
            <p className="mt-2 text-2xl font-bold text-green-500">
              {Math.round(
                ((records.filter((r) => r.status === 'success').length +
                  records.filter((r) => r.status === 'partial').length) /
                  records.length) *
                  100
              )}
              %
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">总变更数</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {records.reduce((sum, r) => sum + r.changesCount, 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
