/**
 * 帮助文档页面
 * 提供 EnvGuard 的使用指南和常见问题解答
 */

import React, { useState } from 'react';
import { ChevronDown, Search, ExternalLink, BookOpen, AlertCircle, Lightbulb } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'basic' | 'advanced' | 'troubleshooting';
}

interface GuideSection {
  id: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

export default function Help(): JSX.Element {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'guides' | 'faq' | 'troubleshooting'>('guides');

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: '如何创建新的虚拟环境？',
      answer:
        '点击左侧菜单的"新建环境"，输入你的项目需求（可以是自然语言描述），EnvGuard 会自动分析需求并创建最优的虚拟环境。无需任何命令行操作。',
      category: 'basic',
    },
    {
      id: '2',
      question: '如何在环境中安装新的依赖包？',
      answer:
        '选择要操作的环境卡片，点击"安装依赖"按钮。输入包名或自然语言描述所需功能，EnvGuard 会自动识别包管理器并安装。安装过程中可以实时查看进度和日志。',
      category: 'basic',
    },
    {
      id: '3',
      question: '环境冲突是什么？如何修复？',
      answer:
        '环境冲突通常指版本冲突、PATH 优先级问题、依赖不兼容等。点击"冲突修复"页面，EnvGuard 会自动扫描所有问题并提供修复方案。修复前会自动备份配置，支持一键回滚。',
      category: 'advanced',
    },
    {
      id: '4',
      question: '如何导出和导入环境配置？',
      answer:
        '在环境详情页面点击"导出配置"按钮可以导出当前环境的完整配置。其他机器上可以通过"导入配置"功能快速复现相同的开发环境。',
      category: 'advanced',
    },
    {
      id: '5',
      question: '为什么某个环境显示为"异常"状态？',
      answer:
        '环境异常通常表示存在问题，如缺失依赖、权限不足、配置错误等。点击环境卡片进入详情页面，然后点击"检测环境问题"按钮，EnvGuard 会自动诊断并提供修复建议。',
      category: 'troubleshooting',
    },
    {
      id: '6',
      question: '如何更改默认的包管理器镜像源？',
      answer:
        '进入全局设置页面，找到"镜像源配置"选项。EnvGuard 预置了多个国内镜像源，可以根据网络情况选择最快的镜像。也支持自定义镜像源 URL。',
      category: 'basic',
    },
    {
      id: '7',
      question: '修复操作是否可以撤销？',
      answer:
        '是的。所有修复操作执行前都会自动备份原始配置。修复完成后可以在修复记录页面查看历史，并支持一键回滚到任何之前的状态。',
      category: 'advanced',
    },
    {
      id: '8',
      question: '如何处理权限不足的错误？',
      answer:
        '某些系统级操作需要管理员权限。如果遇到权限错误，请以管理员身份运行 EnvGuard。在 macOS 上可能需要输入密码，在 Windows 上需要以管理员身份启动应用。',
      category: 'troubleshooting',
    },
  ];

  const guideItems: GuideSection[] = [
    {
      id: '1',
      title: '快速开始',
      content: `
1. 打开 EnvGuard 应用
2. 点击"新建环境"按钮
3. 输入你的项目需求（例如："我需要做数据分析，需要 pandas、numpy、matplotlib"）
4. 选择创建新环境或升级现有环境
5. 点击"创建"，等待环境自动创建完成
6. 环境创建完成后会自动显示在首页的环境卡片列表中
      `,
      icon: <BookOpen size={24} />,
    },
    {
      id: '2',
      title: '环境管理',
      content: `
环境卡片显示了每个环境的关键信息：
- 环境名称和自定义标签
- 运行语言类型和版本号
- 环境状态（绿色正常/黄色警告/红色异常）
- 创建时间和所属项目

快捷操作按钮：
- 激活环境：切换到该环境
- 详情：查看完整配置和依赖清单
- 安装依赖：在环境中添加新的包
- 检测冲突：扫描环境问题
- 删除：移除环境
      `,
      icon: <Lightbulb size={24} />,
    },
    {
      id: '3',
      title: '冲突修复指南',
      content: `
EnvGuard 可以自动检测和修复以下常见问题：

1. 版本冲突：多个 Python/Node 版本的 PATH 优先级问题
2. 依赖冲突：包版本不兼容导致的冲突
3. 环境污染：全局环境与虚拟环境互相干扰
4. 镜像源问题：包管理器镜像源失效或超时
5. 权限问题：权限不足导致的操作失败
6. 配置错误：环境变量设置错误

修复流程：
1. 进入"冲突修复"页面
2. 点击"扫描问题"按钮
3. 查看检测到的所有问题
4. 点击"一键修复"或查看手动修复步骤
5. 修复完成后查看修复报告
      `,
      icon: <AlertCircle size={24} />,
    },
  ];

  const filteredFAQ = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">帮助中心</h1>
        <p className="mt-2 text-muted-foreground">了解如何使用 EnvGuard 管理开发环境</p>
      </div>

      {/* 标签页 */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          {(['guides', 'faq', 'troubleshooting'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 font-medium transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'guides' && '使用指南'}
              {tab === 'faq' && '常见问题'}
              {tab === 'troubleshooting' && '故障排除'}
            </button>
          ))}
        </div>
      </div>

      {/* 使用指南 */}
      {activeTab === 'guides' && (
        <div className="space-y-4">
          {guideItems.map((guide) => (
            <div key={guide.id} className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="text-primary">{guide.icon}</div>
                <h3 className="text-xl font-semibold text-foreground">{guide.title}</h3>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm text-foreground">
                {guide.content}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* 常见问题 */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索问题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* FAQ 列表 */}
          <div className="space-y-3">
            {filteredFAQ.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">未找到相关问题</p>
              </div>
            ) : (
              filteredFAQ.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-card">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-muted"
                  >
                    <h3 className="font-semibold text-foreground">{item.question}</h3>
                    <ChevronDown
                      size={20}
                      className={`text-muted-foreground transition-transform ${
                        expandedFAQ === item.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedFAQ === item.id && (
                    <div className="border-t border-border bg-muted p-4">
                      <p className="text-foreground">{item.answer}</p>
                      <span className="mt-3 inline-block rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                        {item.category === 'basic' && '基础'}
                        {item.category === 'advanced' && '进阶'}
                        {item.category === 'troubleshooting' && '故障排除'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 故障排除 */}
      {activeTab === 'troubleshooting' && (
        <div className="space-y-4">
          {filteredFAQ
            .filter((item) => item.category === 'troubleshooting')
            .map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted"
                >
                  <h3 className="font-semibold text-foreground">{item.question}</h3>
                  <ChevronDown
                    size={20}
                    className={`text-muted-foreground transition-transform ${
                      expandedFAQ === item.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedFAQ === item.id && (
                  <div className="border-t border-border bg-muted p-4">
                    <p className="text-foreground">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* 底部链接 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">需要更多帮助？</h3>
        <div className="space-y-2">
          <a
            href="#"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink size={18} />
            查看完整文档
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink size={18} />
            提交问题反馈
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink size={18} />
            联系技术支持
          </a>
        </div>
      </div>
    </div>
  );
}
