/**
 * Linux 打包脚本
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🐧 开始打包 Linux 版本...\n');

try {
  // 构建前端
  console.log('📦 构建前端资源...');
  execSync('npm run build:frontend', { stdio: 'inherit' });

  // 构建 Electron 主进程
  console.log('\n⚙️  构建 Electron 主进程...');
  execSync('npm run build:electron', { stdio: 'inherit' });

  // 使用 electron-builder 打包
  console.log('\n📦 使用 electron-builder 打包...');
  execSync('electron-builder --linux --publish never', { stdio: 'inherit' });

  console.log('\n✅ Linux 版本打包完成！');
  console.log('📁 输出目录: ./release');
} catch (error) {
  console.error('\n❌ 打包失败:', error.message);
  process.exit(1);
}
