/**
 * 离线智能解析引擎
 * 不依赖任何外部 API，纯本地离线运行
 * 支持：需求文本解析、错误日志分析、配置文件识别
 */

import type { DemandAnalysis } from '../../src/types';
import { logger } from '../logger/logger';

/**
 * 解析结果
 */
export interface ParseResult {
  success: boolean;
  analysis: DemandAnalysis;
  confidence: number; // 0-100 置信度
  suggestions: string[];
  warnings: string[];
}

/**
 * 离线解析器类
 */
export class OfflineParser {
  /**
   * 技术栈关键词库
   */
  private readonly techStackKeywords = {
    python: {
      keywords: [
        'python',
        'py',
        'pip',
        'venv',
        'virtualenv',
        'conda',
        'anaconda',
        'django',
        'flask',
        'fastapi',
        'numpy',
        'pandas',
        'tensorflow',
        'pytorch',
        'scikit-learn',
      ],
      versions: ['3.11', '3.10', '3.9', '3.8', '3.7', '2.7'],
    },
    nodejs: {
      keywords: [
        'node',
        'npm',
        'yarn',
        'pnpm',
        'express',
        'react',
        'vue',
        'angular',
        'next',
        'nuxt',
        'nest',
        'javascript',
        'typescript',
        'js',
        'ts',
      ],
      versions: ['20.x', '18.x', '16.x', '14.x', '12.x'],
    },
    java: {
      keywords: [
        'java',
        'maven',
        'gradle',
        'spring',
        'springboot',
        'jdk',
        'tomcat',
        'junit',
        'mockito',
      ],
      versions: ['21', '20', '19', '18', '17', '16', '15', '11', '8'],
    },
    go: {
      keywords: ['go', 'golang', 'gin', 'echo', 'beego', 'gorm', 'go mod'],
      versions: ['1.21', '1.20', '1.19', '1.18', '1.17'],
    },
    rust: {
      keywords: ['rust', 'cargo', 'tokio', 'actix', 'rocket', 'warp'],
      versions: ['1.70', '1.69', '1.68'],
    },
    csharp: {
      keywords: ['csharp', 'c#', '.net', 'dotnet', 'asp.net', 'entity framework', 'nuget'],
      versions: ['8.0', '7.0', '6.0', '5.0', '.net framework 4.8'],
    },
  };

  /**
   * 场景关键词库
   */
  private readonly scenarioKeywords = {
    web_backend: [
      'api',
      '接口',
      '后端',
      'backend',
      'server',
      '服务器',
      'rest',
      'graphql',
      'microservice',
    ],
    web_frontend: ['前端', 'frontend', 'ui', 'ux', 'react', 'vue', 'angular', 'web', '网页'],
    data_analysis: [
      '数据分析',
      'data analysis',
      'pandas',
      'numpy',
      'matplotlib',
      'seaborn',
      'jupyter',
      '数据',
    ],
    machine_learning: [
      '机器学习',
      'ml',
      'ai',
      '人工智能',
      'tensorflow',
      'pytorch',
      'scikit-learn',
      'deep learning',
      '深度学习',
    ],
    desktop_app: ['桌面', 'desktop', 'electron', 'qt', 'wxpython', 'tkinter', '应用程序'],
    mobile_app: ['移动', 'mobile', 'android', 'ios', 'react native', 'flutter'],
    devops: [
      'devops',
      'docker',
      'kubernetes',
      'ci/cd',
      'jenkins',
      'gitlab',
      'github actions',
      '部署',
    ],
    database: ['数据库', 'database', 'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'],
  };

  /**
   * 常见错误模式
   */
  private readonly errorPatterns = {
    version_conflict: /version.*conflict|conflict.*version|版本.*冲突|冲突.*版本/i,
    import_error: /import error|importerror|cannot import|无法导入|导入失败/i,
    module_not_found: /module not found|modulenotfounderror|找不到模块|模块不存在/i,
    permission_denied: /permission denied|权限被拒绝|权限不足|access denied/i,
    path_error: /path error|路径错误|path not found|找不到路径/i,
    dependency_missing: /missing dependency|缺少依赖|dependency not found|依赖不存在/i,
    environment_error: /environment error|环境错误|环境变量|environment variable/i,
  };

  /**
   * 解析需求文本
   */
  public parseRequirements(text: string): ParseResult {
    logger.info('OfflineParser', '开始解析需求文本...');

    const analysis: DemandAnalysis = {
      id: `analysis-${Date.now()}`,
      timestamp: Date.now(),
      rawInput: text,
      detectedLanguages: [],
      detectedVersions: [],
      requiredDependencies: [],
      suggestedScenario: 'general',
      confidence: 0,
      recommendations: [],
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    // 1. 检测编程语言
    const languageDetection = this.detectLanguages(text);
    analysis.detectedLanguages = languageDetection.languages;
    totalConfidence += languageDetection.confidence;
    confidenceCount++;

    // 2. 检测版本号
    const versionDetection = this.detectVersions(text, analysis.detectedLanguages);
    analysis.detectedVersions = versionDetection.versions;
    totalConfidence += versionDetection.confidence;
    confidenceCount++;

    // 3. 检测依赖
    const dependencyDetection = this.detectDependencies(text, analysis.detectedLanguages);
    analysis.requiredDependencies = dependencyDetection.dependencies;
    totalConfidence += dependencyDetection.confidence;
    confidenceCount++;

    // 4. 检测场景
    const scenarioDetection = this.detectScenario(text);
    analysis.suggestedScenario = scenarioDetection.scenario;
    totalConfidence += scenarioDetection.confidence;
    confidenceCount++;

    // 5. 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    // 计算总体置信度
    analysis.confidence = Math.round(totalConfidence / confidenceCount);

    logger.info('OfflineParser', '需求文本解析完成', {
      languages: analysis.detectedLanguages,
      confidence: analysis.confidence,
    });

    return {
      success: true,
      analysis,
      confidence: analysis.confidence,
      suggestions: analysis.recommendations,
      warnings: this.generateWarnings(analysis),
    };
  }

  /**
   * 分析错误日志
   */
  public analyzeErrorLog(errorLog: string): ParseResult {
    logger.info('OfflineParser', '开始分析错误日志...');

    const analysis: DemandAnalysis = {
      id: `analysis-${Date.now()}`,
      timestamp: Date.now(),
      rawInput: errorLog,
      detectedLanguages: [],
      detectedVersions: [],
      requiredDependencies: [],
      suggestedScenario: 'error_recovery',
      confidence: 0,
      recommendations: [],
    };

    // 1. 识别错误类型
    const errorTypes = this.identifyErrorTypes(errorLog);

    // 2. 提取相关信息
    const extractedInfo = this.extractErrorInfo(errorLog);
    analysis.detectedLanguages = extractedInfo.languages;
    analysis.detectedVersions = extractedInfo.versions.map((v) => ({
      language: 'unknown',
      version: v,
    }));

    // 3. 生成修复建议
    analysis.recommendations = this.generateErrorFixSuggestions(errorTypes);

    // 计算置信度
    analysis.confidence = Math.min(100, errorTypes.length * 20 + 40);

    logger.info('OfflineParser', '错误日志分析完成', {
      errorTypes: errorTypes.length,
      confidence: analysis.confidence,
    });

    return {
      success: true,
      analysis,
      confidence: analysis.confidence,
      suggestions: analysis.recommendations,
      warnings: this.generateErrorWarnings(errorTypes),
    };
  }

  /**
   * 识别配置文件
   */
  public identifyConfigFile(content: string, filename: string): ParseResult {
    logger.info('OfflineParser', `分析配置文件: ${filename}`);

    const analysis: DemandAnalysis = {
      id: `analysis-${Date.now()}`,
      timestamp: Date.now(),
      rawInput: content,
      detectedLanguages: [],
      detectedVersions: [],
      requiredDependencies: [],
      suggestedScenario: 'config_analysis',
      confidence: 0,
      recommendations: [],
    };

    // 1. 识别配置文件类型
    const configType = this.identifyConfigType(filename, content);

    // 2. 解析配置内容
    const parsedConfig = this.parseConfigContent(content, configType);
    analysis.detectedLanguages = parsedConfig.languages;
    analysis.detectedVersions = parsedConfig.versions.map((v) => ({
      language: 'unknown',
      version: v,
    }));
    analysis.requiredDependencies = parsedConfig.dependencies;

    // 3. 生成建议
    analysis.recommendations = this.generateConfigRecommendations(configType, parsedConfig);

    analysis.confidence = 85;

    logger.info('OfflineParser', '配置文件分析完成', {
      configType,
      confidence: analysis.confidence,
    });

    return {
      success: true,
      analysis,
      confidence: analysis.confidence,
      suggestions: analysis.recommendations,
      warnings: this.generateConfigWarnings(parsedConfig),
    };
  }

  /**
   * 检测编程语言
   */
  private detectLanguages(text: string): { languages: string[]; confidence: number } {
    const languages: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [lang, data] of Object.entries(this.techStackKeywords)) {
      const matchCount = data.keywords.filter((kw) => lowerText.includes(kw)).length;
      if (matchCount > 0) {
        languages.push(lang);
      }
    }

    const confidence = languages.length > 0 ? Math.min(100, languages.length * 30) : 0;

    return { languages, confidence };
  }

  /**
   * 检测版本号
   */
  private detectVersions(
    text: string,
    languages: string[]
  ): { versions: Array<{ language: string; version: string }>; confidence: number } {
    const versions: Array<{ language: string; version: string }> = [];

    for (const lang of languages) {
      const langData = this.techStackKeywords[lang as keyof typeof this.techStackKeywords];
      if (langData) {
        for (const version of langData.versions) {
          if (text.includes(version)) {
            versions.push({ language: lang, version });
          }
        }
      }
    }

    const confidence = versions.length > 0 ? 80 : 20;

    return { versions, confidence };
  }

  /**
   * 检测依赖
   */
  private detectDependencies(
    text: string,
    languages: string[]
  ): { dependencies: string[]; confidence: number } {
    const dependencies: string[] = [];
    const lowerText = text.toLowerCase();

    // 提取常见的依赖名称
    const depPattern = /(?:import|require|from|use|include)\s+([a-zA-Z0-9_.-]+)/gi;
    let match;

    while ((match = depPattern.exec(text)) !== null) {
      const dep = match[1];
      if (dep && dep.length > 2 && !dependencies.includes(dep)) {
        dependencies.push(dep);
      }
    }

    // 从关键词库中提取依赖
    for (const lang of languages) {
      const langData = this.techStackKeywords[lang as keyof typeof this.techStackKeywords];
      if (langData) {
        for (const keyword of langData.keywords) {
          if (lowerText.includes(keyword) && !dependencies.includes(keyword)) {
            dependencies.push(keyword);
          }
        }
      }
    }

    const confidence = dependencies.length > 0 ? 70 : 30;

    return { dependencies: dependencies.slice(0, 20), confidence };
  }

  /**
   * 检测场景
   */
  private detectScenario(text: string): { scenario: string; confidence: number } {
    const lowerText = text.toLowerCase();
    let bestScenario = 'general';
    let bestScore = 0;

    for (const [scenario, keywords] of Object.entries(this.scenarioKeywords)) {
      const score = keywords.filter((kw) => lowerText.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestScenario = scenario;
      }
    }

    const confidence = bestScore > 0 ? Math.min(100, bestScore * 20) : 40;

    return { scenario: bestScenario, confidence };
  }

  /**
   * 识别错误类型
   */
  private identifyErrorTypes(errorLog: string): string[] {
    const errorTypes: string[] = [];

    for (const [errorType, pattern] of Object.entries(this.errorPatterns)) {
      if (pattern.test(errorLog)) {
        errorTypes.push(errorType);
      }
    }

    return errorTypes;
  }

  /**
   * 提取错误信息
   */
  private extractErrorInfo(errorLog: string): {
    languages: string[];
    versions: string[];
  } {
    const languages: string[] = [];
    const versions: string[] = [];

    // 检测编程语言
    for (const [lang, data] of Object.entries(this.techStackKeywords)) {
      if (data.keywords.some((kw) => errorLog.toLowerCase().includes(kw))) {
        languages.push(lang);
      }
    }

    // 提取版本号
    const versionPattern = /(\d+\.\d+(?:\.\d+)?)/g;
    let match;
    while ((match = versionPattern.exec(errorLog)) !== null) {
      if (!versions.includes(match[1])) {
        versions.push(match[1]);
      }
    }

    return { languages, versions };
  }

  /**
   * 识别配置文件类型
   */
  private identifyConfigType(filename: string, content: string): string {
    const lowerFilename = filename.toLowerCase();

    if (lowerFilename.includes('requirements')) return 'pip_requirements';
    if (lowerFilename.includes('package.json')) return 'npm_package';
    if (lowerFilename.includes('pom.xml')) return 'maven_pom';
    if (lowerFilename.includes('gradle')) return 'gradle_build';
    if (lowerFilename.includes('dockerfile')) return 'docker';
    if (lowerFilename.includes('docker-compose')) return 'docker_compose';
    if (lowerFilename.includes('.env')) return 'env_file';
    if (lowerFilename.includes('config')) return 'config_file';

    // 根据内容推断
    if (content.includes('dependencies') && content.includes('version')) return 'npm_package';
    if (content.includes('<project>') && content.includes('<dependency>')) return 'maven_pom';
    if (content.includes('FROM') && content.includes('RUN')) return 'docker';

    return 'unknown';
  }

  /**
   * 解析配置内容
   */
  private parseConfigContent(
    content: string,
    configType: string
  ): { languages: string[]; versions: string[]; dependencies: string[] } {
    const languages: string[] = [];
    const versions: string[] = [];
    const dependencies: string[] = [];

    if (configType === 'pip_requirements') {
      languages.push('python');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9\-_]+)(?:==|>=|<=)?(.+)?/);
        if (match) {
          dependencies.push(match[1]);
          if (match[2]) {
            versions.push(match[2]);
          }
        }
      }
    } else if (configType === 'npm_package') {
      languages.push('nodejs');
      try {
        const pkg = JSON.parse(content);
        if (pkg.dependencies) {
          dependencies.push(...Object.keys(pkg.dependencies));
        }
        if (pkg.devDependencies) {
          dependencies.push(...Object.keys(pkg.devDependencies));
        }
        if (pkg.engines?.node) {
          versions.push(pkg.engines.node);
        }
      } catch {
        // 解析失败，忽略
      }
    }

    return { languages, versions, dependencies };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(analysis: DemandAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.detectedLanguages.length === 0) {
      recommendations.push('未检测到编程语言，建议明确指定项目使用的技术栈');
    } else {
      recommendations.push(`检测到使用 ${analysis.detectedLanguages.join('、')} 技术栈`);
    }

    if (analysis.detectedVersions.length > 0) {
      recommendations.push(
        `建议创建隔离虚拟环境以支持指定版本: ${analysis.detectedVersions.map((v) => `${v.language}@${v.version}`).join(', ')}`
      );
    }

    if (analysis.requiredDependencies.length > 0) {
      recommendations.push(`检测到 ${analysis.requiredDependencies.length} 个依赖，建议一键安装`);
    }

    if (analysis.suggestedScenario !== 'general') {
      recommendations.push(`检测到 ${analysis.suggestedScenario} 场景，已优化环境配置`);
    }

    return recommendations;
  }

  /**
   * 生成警告
   */
  private generateWarnings(analysis: DemandAnalysis): string[] {
    const warnings: string[] = [];

    if (analysis.confidence < 50) {
      warnings.push('置信度较低，建议手动检查需求描述');
    }

    if (analysis.detectedLanguages.length > 3) {
      warnings.push('检测到多个编程语言，建议确认是否需要多环境支持');
    }

    if (analysis.requiredDependencies.length > 50) {
      warnings.push('依赖数量较多，建议检查是否有重复或不必要的依赖');
    }

    return warnings;
  }

  /**
   * 生成错误修复建议
   */
  private generateErrorFixSuggestions(errorTypes: string[]): string[] {
    const suggestions: string[] = [];

    for (const errorType of errorTypes) {
      switch (errorType) {
        case 'version_conflict':
          suggestions.push('检测到版本冲突，建议升级或降级相关依赖到兼容版本');
          break;
        case 'import_error':
          suggestions.push('检测到导入错误，建议检查依赖是否已安装或路径是否正确');
          break;
        case 'module_not_found':
          suggestions.push('检测到模块缺失，建议安装缺失的依赖包');
          break;
        case 'permission_denied':
          suggestions.push('检测到权限问题，建议检查文件权限或使用管理员权限运行');
          break;
        case 'path_error':
          suggestions.push('检测到路径错误，建议检查环境变量 PATH 配置');
          break;
        case 'dependency_missing':
          suggestions.push('检测到依赖缺失，建议运行包管理器安装所有依赖');
          break;
        case 'environment_error':
          suggestions.push('检测到环境变量错误，建议检查系统环境变量配置');
          break;
      }
    }

    return suggestions;
  }

  /**
   * 生成错误警告
   */
  private generateErrorWarnings(errorTypes: string[]): string[] {
    const warnings: string[] = [];

    if (errorTypes.length === 0) {
      warnings.push('未识别到具体错误类型，建议查看完整错误日志');
    }

    if (errorTypes.includes('permission_denied')) {
      warnings.push('⚠️ 权限问题可能导致系统不稳定，请谨慎处理');
    }

    if (errorTypes.includes('version_conflict')) {
      warnings.push('⚠️ 版本冲突可能影响多个依赖，建议备份后再修复');
    }

    return warnings;
  }

  /**
   * 生成配置建议
   */
  private generateConfigRecommendations(
    configType: string,
    parsedConfig: { languages: string[]; dependencies: string[]; versions: string[] }
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`识别到 ${configType} 配置文件`);

    if (parsedConfig.languages.length > 0) {
      recommendations.push(`配置文件指定的编程语言: ${parsedConfig.languages.join('、')}`);
    }

    if (parsedConfig.dependencies.length > 0) {
      recommendations.push(`配置文件中包含 ${parsedConfig.dependencies.length} 个依赖`);
    }

    if (parsedConfig.versions.length > 0) {
      recommendations.push(`检测到版本约束: ${parsedConfig.versions.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * 生成配置警告
   */
  private generateConfigWarnings(parsedConfig: { dependencies: string[] }): string[] {
    const warnings: string[] = [];

    if (parsedConfig.dependencies.length > 100) {
      warnings.push('依赖数量过多，可能影响安装速度和环境稳定性');
    }

    return warnings;
  }
}

// 导出单例
export const offlineParser = new OfflineParser();
