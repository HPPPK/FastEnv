// 这是一个简单的测试，验证类型系统是否正常工作
import type { Environment, Dependency, EnvironmentConflict } from './src/types';

// 创建一个环境对象
const myEnv: Environment = {
  id: 'env-demo-1',
  name: 'My Python Environment',
  type: 'python',
  version: '3.11.0',
  status: 'healthy',
  path: '/usr/bin/python3',
  dependencies: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: ['demo'],
};

console.log('✅ 环境对象创建成功！');
console.log('环境名称:', myEnv.name);
console.log('环境类型:', myEnv.type);
console.log('环境版本:', myEnv.version);

// 创建一个依赖对象
const myDep: Dependency = {
  name: 'numpy',
  version: '1.24.3',
  packageManager: 'pip',
  type: 'direct',
  installedAt: Date.now(),
};

console.log('\n✅ 依赖对象创建成功！');
console.log('依赖名称:', myDep.name);
console.log('依赖版本:', myDep.version);

// 创建一个冲突对象
const myConflict: EnvironmentConflict = {
  id: 'conflict-demo-1',
  type: 'version_mismatch',
  severity: 'medium',
  affectedEnvironments: ['env-demo-1'],
  description: '这是一个演示冲突',
  autoFixable: true,
  detectedAt: Date.now(),
};

console.log('\n✅ 冲突对象创建成功！');
console.log('冲突类型:', myConflict.type);
console.log('冲突严重程度:', myConflict.severity);
console.log('可自动修复:', myConflict.autoFixable);

console.log('\n🎉 所有类型都正常工作！');