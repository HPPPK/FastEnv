const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EnvironmentInstaller } = require('../dist/service/env-install/env-installer.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-install-cancel-'));
const binDir = path.join(root, 'node_modules', '.bin');
fs.mkdirSync(binDir, { recursive: true });
const fakeRunner = path.join(root, 'node_modules', 'npm', 'bin', 'npm-cli.js');
fs.mkdirSync(path.dirname(fakeRunner), { recursive: true });
const fakeRunnerSource = [
  'const args = process.argv.slice(2);',
  "if (args.includes('list')) {",
  "  process.stdout.write(JSON.stringify({ dependencies: {} }));",
  '} else {',
  '  setTimeout(() => process.exit(0), 30000);',
  '}',
  '',
].join('\n');
fs.writeFileSync(fakeRunner, fakeRunnerSource, 'utf8');

if (process.platform === 'win32') {
  fs.writeFileSync(path.join(binDir, 'npm.cmd'), '@echo off\r\n', 'utf8');
} else {
  const npmPath = path.join(binDir, 'npm');
  fs.writeFileSync(npmPath, '#!/usr/bin/env node\n' + fakeRunnerSource, 'utf8');
  fs.chmodSync(npmPath, 0o755);
}

(async () => {
  const installer = new EnvironmentInstaller();
  const controller = new AbortController();
  const progress = [];
  const operationId = 'install-cancel-test';
  const startedAt = Date.now();
  const installPromise = installer.installPackages({
    environmentPath: root,
    environmentType: 'node',
    packages: ['synthetic-long-running-package'],
    operationId,
    signal: controller.signal,
    onProgress: (event) => progress.push(event),
  });

  await new Promise((resolve) => setTimeout(resolve, 500));
  controller.abort();
  installer.cancel(operationId);
  const result = await installPromise;
  const elapsed = Date.now() - startedAt;

  assert.equal(result.success, false);
  assert.equal(result.cancelled, true);
  assert.equal(
    progress.some((event) => event.status === 'cancelled'),
    true
  );
  assert.ok(elapsed < 10000, '取消不应等待完整的模拟安装时间');
  console.log(JSON.stringify({ result, progress, elapsed }, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
