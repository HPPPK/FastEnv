/**
 * AI 集成演示组件
 * 展示如何在前端使用 AI 集成 API
 */

import React, { useState, useEffect } from 'react';
import { aiIntegrationAPI, parseRequirementText } from '../api/ai-integration';
import type { AIClientInfo, DemandAnalysis } from '../types';

export const AIIntegrationDemo: React.FC = () => {
  const [requirementText, setRequirementText] = useState('');
  const [analysis, setAnalysis] = useState<DemandAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<AIClientInfo[]>([]);
  const [status, setStatus] = useState<string>('未初始化');

  // 初始化 AI 集成
  useEffect(() => {
    const init = async () => {
      try {
        const result = await aiIntegrationAPI.initialize();
        if (result.success) {
          setStatus('已初始化');
          // 检测可用的 AI 客户端
          const detectedClients = await aiIntegrationAPI.detectClients();
          setClients(detectedClients);
        } else {
          setStatus(`初始化失败: ${result.message}`);
        }
      } catch (error) {
        setStatus(`初始化错误: ${String(error)}`);
      }
    };

    init();
  }, []);

  // 解析需求
  const handleParseRequirement = async () => {
    if (!requirementText.trim()) {
      alert('请输入需求文本');
      return;
    }

    setLoading(true);
    try {
      const result = await parseRequirementText(requirementText);
      setAnalysis(result);
    } catch (error) {
      console.error('解析失败:', error);
      alert(`解析失败: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">AI 集成演示</h2>

      {/* 状态显示 */}
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <p className="text-sm">
          <span className="font-semibold">服务状态:</span> {status}
        </p>
        <p className="text-sm mt-1">
          <span className="font-semibold">检测到的 AI 客户端:</span> {clients.length} 个
        </p>
        {clients.length > 0 && (
          <ul className="mt-2 ml-4 text-xs">
            {clients.map((client) => (
              <li key={client.id}>
                • {client.name} ({client.type}) - {client.isAvailable ? '可用' : '不可用'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 需求输入 */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">输入项目需求:</label>
        <textarea
          value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)}
          placeholder="例如: 我需要搭建一个 Python 数据分析项目，需要 pandas, numpy, matplotlib..."
          className="w-full h-24 p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500"
        />
      </div>

      {/* 解析按钮 */}
      <button
        onClick={handleParseRequirement}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold"
      >
        {loading ? '解析中...' : '解析需求'}
      </button>

      {/* 分析结果 */}
      {analysis && (
        <div className="mt-6 p-4 bg-gray-800 rounded">
          <h3 className="text-lg font-semibold mb-3">分析结果</h3>

          <div className="space-y-3">
            {/* 检测到的语言 */}
            {analysis.detectedLanguages.length > 0 && (
              <div>
                <p className="text-sm font-semibold">检测到的语言:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {analysis.detectedLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-1 bg-blue-600 rounded text-xs"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 检测到的版本 */}
            {analysis.detectedVersions.length > 0 && (
              <div>
                <p className="text-sm font-semibold">检测到的版本:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {analysis.detectedVersions.map((version, idx) => {
                    const versionStr = typeof version === 'string' 
                      ? version 
                      : `${(version as any).language} ${(version as any).version}`;
                    return (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-green-600 rounded text-xs"
                      >
                        {versionStr}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 所需依赖 */}
            {analysis.requiredDependencies.length > 0 && (
              <div>
                <p className="text-sm font-semibold">所需依赖:</p>
                <ul className="mt-1 ml-4 text-sm">
                  {analysis.requiredDependencies.map((dep) => (
                    <li key={dep} className="list-disc">
                      {dep}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 建议场景 */}
            <div>
              <p className="text-sm font-semibold">建议场景:</p>
              <p className="text-sm mt-1 text-gray-300">{analysis.suggestedScenario}</p>
            </div>

            {/* 置信度 */}
            <div>
              <p className="text-sm font-semibold">置信度:</p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${analysis.confidence * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(analysis.confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* 推荐 */}
            {analysis.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-semibold">推荐:</p>
                <ul className="mt-1 ml-4 text-sm">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="list-disc text-gray-300">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrationDemo;
