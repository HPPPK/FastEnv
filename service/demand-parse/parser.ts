/**
 * 需求解析服务
 * 智能解析用户需求、文档、截图，生成环境搭建方案
 */

import type { DemandParseResult, EnvironmentRecommendation } from '../../src/types';

/**
 * 需求解析器类
 */
export class DemandParser {
  /**
   * 关键词规则库
   */
  private keywordRules = {
    python: {
      keywords: [
        'python',
        'py',
        'django',
        'flask',
        'fastapi',
        'pandas',
        'numpy',
        'tensorflow',
        'pytorch',
      ],
      type: 'python',
    },
    node: {
      keywords: ['node', 'nodejs', 'npm', 'react', 'vue', 'angular', 'express', 'nest'],
      type: 'node',
    },
    java: {
      keywords: ['java', 'spring', 'maven', 'gradle', 'junit', 'tomcat'],
      type: 'java',
    },
    go: {
      keywords: ['go', 'golang', 'gin', 'echo', 'beego'],
      type: 'go',
    },
    rust: {
      keywords: ['rust', 'cargo', 'tokio', 'actix'],
      type: 'rust',
    },
  };

  /**
   * 版本规则库
   */
  private versionPatterns = [
    /python\s*(\d+\.\d+\.\d+|\d+\.\d+)/gi,
    /node(?:\.?js)?\s*(\d+(?:\.\d+){0,2})/gi,
    /java\s*(\d+)/gi,
    /go\s*(\d+\.\d+\.\d+|\d+\.\d+)/gi,
  ];

  /**
   * 解析文本需求
   */
  public parseText(text: string): DemandParseResult {
    const lowerText = text.toLowerCase();

    // 检测技术栈
    const detectedTypes = this.detectTechStack(lowerText);

    // 提取版本号
    const versions = this.extractVersions(text);

    // 提取依赖库
    const dependencies = this.extractDependencies(lowerText);

    // 判断业务场景
    const scenario = this.detectScenario(lowerText);

    // 生成推荐方案
    const recommendation = this.generateRecommendation(detectedTypes, versions, dependencies);

    return {
      success: true,
      detectedTypes,
      versions,
      dependencies,
      scenario,
      recommendation,
      confidence: this.calculateConfidence(detectedTypes, versions),
    };
  }

  /**
   * 检测技术栈
   */
  private detectTechStack(text: string): string[] {
    const detected: string[] = [];

    for (const rule of Object.values(this.keywordRules)) {
      const hasKeyword = rule.keywords.some((kw) =>
        new RegExp('(^|[^a-z0-9])' + kw + '([^a-z0-9]|$)', 'i').test(text)
      );
      if (hasKeyword) {
        detected.push(rule.type);
      }
    }

    return detected.length > 0 ? detected : ['python']; // 默认 Python
  }

  /**
   * 提取版本号
   */
  private extractVersions(text: string): Record<string, string> {
    const versions: Record<string, string> = {};

    for (const pattern of this.versionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const toolName = match[0]
          .split(/\s+/)[0]
          .toLowerCase()
          .replace(/\.?js$/, '');
        if (match[1]) {
          versions[toolName] = match[1];
        }
      }
    }

    return versions;
  }

  /**
   * 提取依赖库
   */
  private extractDependencies(text: string): string[] {
    const dependencies: string[] = [];

    const addDependency = (name?: string): void => {
      const normalized = name?.trim().replace(/[，。；;、,.]+$/g, '');
      const ignored = [
        'python',
        'node',
        'nodejs',
        'java',
        'go',
        'rust',
        'and',
        'or',
        'with',
        'using',
        'use',
        'for',
        'the',
        'a',
        'an',
        'plus',
      ];
      if (
        normalized &&
        !ignored.includes(normalized) &&
        !/^\d+(?:\.\d+)*$/.test(normalized) &&
        !dependencies.includes(normalized)
      ) {
        dependencies.push(normalized);
      }
    };

    const knownPackages = [
      'numpy',
      'pandas',
      'scikit-learn',
      'sklearn',
      'matplotlib',
      'seaborn',
      'tensorflow',
      'torch',
      'pytorch',
      'flask',
      'django',
      'fastapi',
      'requests',
      'beautifulsoup4',
      'pytest',
      'jupyter',
      'notebook',
      'scipy',
      'statsmodels',
      'react',
      'react-dom',
      'typescript',
      'vite',
      'axios',
      'vue',
      'angular',
      'express',
      'spring-boot',
      'springboot',
      'mysql',
      'maven',
      'junit',
    ];

    for (const pkg of knownPackages) {
      if (text.includes(pkg)) {
        addDependency(pkg === 'sklearn' ? 'scikit-learn' : pkg);
      }
    }

    if (text.includes('spring boot') || text.includes('springboot')) {
      addDependency('spring-boot');
    }

    // 支持 “安装 numpy、pandas、scikit-learn” / “需要 xxx, yyy” 这类中文自然语言
    const listPatterns = [
      /(?:安装|需要|使用|依赖|库|包)\s*([a-zA-Z0-9_\-.,，、\s]+)/gi,
      /(?:install|require|requires|use|using|with)\s+([a-zA-Z0-9_\-.,，、\s]+)/gi,
    ];

    for (const pattern of listPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const rawList = match[1] ?? '';
        rawList
          .split(/[,\s，、]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach(addDependency);
      }
    }

    // 简单的依赖提取规则
    const depPatterns = [
      /(?:install|require|import|use)\s+([a-zA-Z0-9\-_]+)/gi,
      /(?:package|library|module)\s+([a-zA-Z0-9\-_]+)/gi,
    ];

    for (const pattern of depPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        addDependency(match[1]);
      }
    }

    return dependencies.slice(0, 20);
  }

  /**
   * 检测业务场景
   */
  private detectScenario(text: string): string {
    const scenarios = {
      'data-analysis': ['数据分析', 'data analysis', 'pandas', 'numpy', 'matplotlib'],
      'web-backend': ['后端', 'backend', 'api', 'django', 'flask', 'express', 'spring'],
      'web-frontend': ['前端', 'frontend', 'react', 'vue', 'angular', 'typescript'],
      'ai-ml': ['ai', 'machine learning', 'tensorflow', 'pytorch', 'scikit-learn'],
      desktop: ['桌面', 'desktop', 'electron', 'tauri', 'qt'],
      devops: ['devops', 'docker', 'kubernetes', 'ci/cd'],
    };

    for (const [scenario, keywords] of Object.entries(scenarios)) {
      if (keywords.some((kw) => text.includes(kw))) {
        return scenario;
      }
    }

    return 'general';
  }

  /**
   * 生成推荐方案
   */
  private generateRecommendation(
    types: string[],
    versions: Record<string, string>,
    dependencies: string[]
  ): EnvironmentRecommendation {
    const primaryType = types[0] || 'python';

    return {
      environmentName: `${primaryType}-${Date.now().toString(36)}`,
      primaryLanguage: primaryType,
      recommendedVersion: versions[primaryType] || this.getDefaultVersion(primaryType),
      additionalTools: types.slice(1),
      suggestedDependencies: dependencies,
      dependencies,
      createMode: 'new-isolated',
      description: `基于需求自动生成的 ${primaryType} 开发环境`,
      estimatedSetupTime: '2-5 分钟',
    };
  }

  /**
   * 获取默认版本
   */
  private getDefaultVersion(type: string): string {
    const defaults: Record<string, string> = {
      python: '3.10',
      node: '18.0',
      java: '11',
      go: '1.20',
      rust: '1.70',
    };
    return defaults[type] || 'latest';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(types: string[], versions: Record<string, string>): number {
    let confidence = 0.5; // 基础分

    if (types.length > 0) confidence += 0.2;
    if (Object.keys(versions).length > 0) confidence += 0.2;
    if (types.length > 1) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  /**
   * 解析文档内容
   */
  public parseDocument(content: string): DemandParseResult {
    // 文档解析与文本解析相同
    return this.parseText(content);
  }

  /**
   * 解析截图 OCR 文本
   */
  public parseScreenshot(ocrText: string): DemandParseResult {
    // 截图解析与文本解析相同
    return this.parseText(ocrText);
  }
}

// 导出单例
export const demandParser = new DemandParser();
