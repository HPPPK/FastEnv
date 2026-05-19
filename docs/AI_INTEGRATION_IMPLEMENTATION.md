# AI 集成实现完整指南

## 概述

本文档详细说明了 EnvGuard 中 AI 集成功能的完整实现，包括离线智能解析、AI 客户端检测、IPC 通信和前端集成。

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│     前端渲染层 (React Components)        │
│  - AIIntegrationDemo.tsx                │
│  - 其他需求解析相关页面                  │
└────────────────┬────────────────────────┘
                 │ IPC 通信
┌────────────────▼────────────────────────┐
│   IPC 处理层 (Electron Main)             │
│  - ai-integration-handler.ts            │
│  - 路由: ai:parse-requirement 等        │
└────────────────┬────────────────────────┘
                 │ 调用
┌────────────────▼────────────────────────┐
│   业务服务层 (Node.js Services)         │
│  - ai-integration.ts (主服务)           │
│  - offline-parser.ts (离线解析)         │
│  - ai-detector.ts (客户端检测)          │
└─────────────────────────────────────────┘
```

## 核心模块详解

### 1. 离线智能解析引擎 (`service/ai-integration/offline-parser.ts`)

**功能**：
- 基于关键词规则库的需求解析
- 支持多种输入格式（文本、错误日志、配置文件）
- 自动识别编程语言、版本、依赖库

**关键方法**：
```typescript
parseRequirement(input: string): DemandAnalysis
analyzeError(errorLog: string): DemandAnalysis
identifyConfig(filename: string, content: string): DemandAnalysis
```

**规则库包含**：
- 语言关键词：Python、Node.js、Java、Go、Rust 等
- 版本模式：3.8、3.9、3.10、3.11、3.12 等
- 依赖库：pandas、numpy、django、express、spring 等
- 场景识别：数据分析、后端开发、前端开发、AI/ML 等

### 2. AI 客户端检测器 (`service/ai-integration/ai-detector.ts`)

**功能**：
- 自动检测系统中可用的 AI 客户端
- 支持桌面客户端（Claude Desktop、ChatGPT 等）
- 支持浏览器客户端（Web 版本）
- 检测本地 LLM（Ollama、LM Studio 等）

**检测流程**：
1. 扫描常见安装路径
2. 检查进程运行状态
3. 验证 API 可用性
4. 返回可用客户端列表

### 3. AI 集成主服务 (`service/ai-integration/ai-integration.ts`)

**功能**：
- 协调离线解析和 AI 客户端
- 管理用户授权和隐私设置
- 提供统一的 API 接口
- 处理错误和降级策略

**核心方法**：
```typescript
initialize(): Promise<void>
parseRequirement(request: AIParseRequest): Promise<AIParseResponse>
analyzeError(errorLog: string): Promise<AIParseResponse>
identifyConfig(filename: string, content: string): Promise<AIParseResponse>
detectClients(): Promise<AIClientInfo[]>
requestConsent(): Promise<ConsentResponse>
```

### 4. IPC 处理程序 (`electron/ipc/ai-integration-handler.ts`)

**功能**：
- 处理前端的 IPC 请求
- 调用后端服务
- 返回结构化响应

**注册的 IPC 通道**：
- `ai:initialize` - 初始化服务
- `ai:parse-requirement` - 解析需求
- `ai:analyze-error` - 分析错误
- `ai:identify-config` - 识别配置
- `ai:detect-clients` - 检测客户端
- `ai:get-clients` - 获取客户端列表
- `ai:get-status` - 获取服务状态
- `ai:request-consent` - 请求用户授权
- `ai:handle-consent` - 处理用户授权
- `ai:set-config` - 设置配置
- `ai:get-config` - 获取配置

### 5. 前端 API 封装 (`src/api/ai-integration.ts`)

**功能**：
- 提供类型安全的 API 接口
- 处理 IPC 通信
- 错误处理和降级
- 便捷函数封装

**主要 API**：
```typescript
aiIntegrationAPI.initialize()
aiIntegrationAPI.parseRequirement(request)
aiIntegrationAPI.analyzeError(errorLog)
aiIntegrationAPI.identifyConfig(filename, content)
aiIntegrationAPI.detectClients()
aiIntegrationAPI.getStatus()
aiIntegrationAPI.requestConsent()
aiIntegrationAPI.handleConsent(response)
aiIntegrationAPI.setConfig(config)
aiIntegrationAPI.getConfig()

// 便捷函数
parseRequirementText(text)
analyzeErrorLog(errorLog)
identifyConfigFile(filename, content)
```

## 数据模型

### AIClientInfo
```typescript
interface AIClientInfo {
  id: string;                    // 唯一标识
  name: string;                  // 客户端名称
  type: 'desktop' | 'browser' | 'local';  // 类型
  version?: string;              // 版本
  isAvailable: boolean;          // 是否可用
  isLoggedIn?: boolean;          // 是否已登录
  path?: string;                 // 安装路径
  lastChecked?: number;          // 最后检查时间
}
```

### AIIntegrationConfig
```typescript
interface AIIntegrationConfig {
  mode: 'offline' | 'desktop-client' | 'browser';
  enableOfflineMode: boolean;
  enableDesktopMode: boolean;
  enableBrowserMode: boolean;
  preferredClient?: string;
  autoDetectClients: boolean;
  userConsent: boolean;
  consentMode?: 'all' | 'offline-only' | 'none';
}
```

### AIParseRequest
```typescript
interface AIParseRequest {
  type: 'requirement' | 'error' | 'config' | 'document' | 'image';
  content: string;
  filename?: string;
  rawContent?: string;
}
```

### AIParseResponse
```typescript
interface AIParseResponse {
  success: boolean;
  analysis: DemandAnalysis;
  mode: 'offline' | 'desktop-client' | 'browser';
  confidence: number;
  error?: string;
}
```

### DemandAnalysis
```typescript
interface DemandAnalysis {
  id: string;
  timestamp: number;
  rawInput: string;
  detectedLanguages: string[];
  detectedVersions: Array<{ language: string; version: string }>;
  requiredDependencies: string[];
  suggestedScenario: string;
  confidence: number;
  recommendations: string[];
}
```

## 使用示例

### 前端使用

#### 1. 基础初始化
```typescript
import { aiIntegrationAPI } from '@/api/ai-integration';

// 初始化服务
const result = await aiIntegrationAPI.initialize();
if (result.success) {
  console.log('AI 集成服务已初始化');
}
```

#### 2. 解析用户需求
```typescript
import { parseRequirementText } from '@/api/ai-integration';

const analysis = await parseRequirementText(
  '我需要搭建一个 Python 数据分析项目，需要 pandas, numpy, matplotlib'
);

console.log('检测到的语言:', analysis.detectedLanguages);
console.log('所需依赖:', analysis.requiredDependencies);
console.log('建议场景:', analysis.suggestedScenario);
```

#### 3. 分析错误日志
```typescript
import { analyzeErrorLog } from '@/api/ai-integration';

const errorLog = `
ModuleNotFoundError: No module named 'pandas'
  File "main.py", line 1, in <module>
    import pandas as pd
`;

const analysis = await analyzeErrorLog(errorLog);
console.log('推荐:', analysis.recommendations);
```

#### 4. 识别配置文件
```typescript
import { identifyConfigFile } from '@/api/ai-integration';

const analysis = await identifyConfigFile(
  'requirements.txt',
  'pandas==1.3.0\nnumpy==1.21.0\nmatplotlib==3.4.2'
);

console.log('检测到的依赖:', analysis.requiredDependencies);
```

#### 5. 检测 AI 客户端
```typescript
const clients = await aiIntegrationAPI.detectClients();
clients.forEach(client => {
  console.log(`${client.name} (${client.type}): ${client.isAvailable ? '可用' : '不可用'}`);
});
```

#### 6. 请求用户授权
```typescript
const consentResult = await aiIntegrationAPI.requestConsent();
if (consentResult.granted) {
  console.log(`用户选择: ${consentResult.mode}`);
}
```

### React 组件集成

```typescript
import { AIIntegrationDemo } from '@/components/AIIntegrationDemo';

export function MyPage() {
  return (
    <div>
      <h1>需求解析</h1>
      <AIIntegrationDemo />
    </div>
  );
}
```

## 隐私与安全

### 隐私保护机制

1. **离线优先**：默认使用离线解析，不需要网络连接
2. **用户授权**：使用 AI 客户端前需要明确授权
3. **本地存储**：所有数据存储在本地，不上传到云端
4. **配置控制**：用户可以完全禁用 AI 功能

### 安全考虑

1. **IPC 隔离**：使用 Electron 安全 IPC，禁用 nodeIntegration
2. **权限校验**：所有操作都经过权限检查
3. **错误处理**：完善的错误处理和降级策略
4. **日志记录**：所有操作都有日志记录

## 扩展指南

### 添加新的解析规则

在 `service/ai-integration/offline-parser.ts` 中修改规则库：

```typescript
private readonly languageKeywords = {
  'Python': ['python', 'py', 'pip', 'venv', 'conda'],
  'Node.js': ['node', 'npm', 'yarn', 'pnpm', 'javascript'],
  // 添加新语言
  'Rust': ['rust', 'cargo', 'rustup'],
};
```

### 添加新的 AI 客户端支持

在 `service/ai-integration/ai-detector.ts` 中添加检测逻辑：

```typescript
private async detectCustomClient(): Promise<AIClientInfo | null> {
  // 实现自定义客户端检测
  return {
    id: 'custom-client',
    name: 'Custom AI Client',
    type: 'desktop',
    isAvailable: true,
  };
}
```

### 添加新的 IPC 通道

在 `electron/ipc/ai-integration-handler.ts` 中添加处理程序：

```typescript
ipcMain.handle('ai:new-feature', async (event, params) => {
  try {
    const result = await aiIntegration.newFeature(params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
```

## 性能优化

1. **缓存**：缓存检测结果，避免重复检测
2. **异步处理**：所有 I/O 操作都是异步的
3. **错误恢复**：自动降级到离线模式
4. **资源清理**：及时释放资源

## 故障排查

### 常见问题

1. **AI 客户端检测失败**
   - 检查客户端是否正确安装
   - 检查防火墙设置
   - 查看日志文件

2. **解析结果不准确**
   - 检查输入文本格式
   - 更新规则库
   - 考虑使用 AI 客户端

3. **IPC 通信超时**
   - 检查主进程是否正常运行
   - 增加超时时间
   - 查看错误日志

## 测试

### 单元测试

```typescript
describe('AI Integration', () => {
  it('should parse requirement text', async () => {
    const analysis = await parseRequirementText('Python 3.9 with pandas');
    expect(analysis.detectedLanguages).toContain('Python');
    expect(analysis.requiredDependencies).toContain('pandas');
  });

  it('should detect AI clients', async () => {
    const clients = await aiIntegrationAPI.detectClients();
    expect(Array.isArray(clients)).toBe(true);
  });
});
```

### 集成测试

```typescript
describe('AI Integration IPC', () => {
  it('should handle ai:parse-requirement', async () => {
    const response = await ipcClient.invoke('ai:parse-requirement', {
      type: 'requirement',
      content: 'Python with pandas',
    });
    expect(response.success).toBe(true);
  });
});
```

## 总结

AI 集成功能提供了强大的需求解析能力，同时保护用户隐私。通过离线优先的设计和灵活的 AI 客户端支持，用户可以根据自己的需求选择合适的解析方式。

## 相关文档

- [AI 集成完成状态](./AI_INTEGRATION_COMPLETION.md)
- [AI 集成设计](./AI_INTEGRATION.md)
- [IPC API 文档](./ipc-api.md)
- [项目快速开始](./QUICK_START.md)
