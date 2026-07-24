const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EnvironmentInstaller } = require('../dist/service/env-install/env-installer.js');

function createFakeNodeEnvironment(root) {
  const binDir = path.join(root, 'node_modules', '.bin');
  const cliPath = path.join(root, 'node_modules', 'npm', 'bin', 'npm-cli.js');
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(path.dirname(cliPath), { recursive: true });
  const cli = [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "const args = process.argv.slice(2);",
    "const root = process.cwd();",
    "const nodeModules = path.join(root, 'node_modules');",
    "if (args[0] === 'list') {",
    "  const dependencies = {};",
    "  for (const name of fs.readdirSync(nodeModules)) {",
    "    if (name !== '.bin' && name !== 'npm' && fs.existsSync(path.join(nodeModules, name, 'package.json'))) dependencies[name] = { version: '0.0.0' };",
    "  }",
    "  process.stdout.write(JSON.stringify({ dependencies }));",
    "  process.exit(0);",
    "}",
    "if (args[0] === 'install') {",
    "  const pkg = args[args.length - 1];",
    "  if (pkg === 'synthetic-network-failure') { process.stderr.write('npm ERR! code ENETUNREACH network unavailable'); process.exit(1); }",
    "  if (pkg === 'synthetic-permission-failure') { process.stderr.write('npm ERR! code EACCES permission denied'); process.exit(1); }",
    "  if (pkg === 'synthetic-peer-conflict') { process.stderr.write('npm ERR! ERESOLVE unable to resolve peer dependency'); process.exit(1); }",
    "  const packageName = pkg.split('@')[0];",
    "  const packageDir = path.join(nodeModules, packageName);",
    "  fs.mkdirSync(packageDir, { recursive: true });",
    "  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: packageName, version: '0.0.0' }));",
    "  process.exit(0);",
    "}",
    "process.stderr.write('unsupported fake npm command');",
    "process.exit(1);",
  ].join('\n');
  fs.writeFileSync(cliPath, cli, 'utf8');
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(binDir, 'npm.cmd'), '@echo off\r\nnode "%~dp0..\\npm\\bin\\npm-cli.js" %*\r\n', 'utf8');
  } else {
    const npmPath = path.join(binDir, 'npm');
    fs.writeFileSync(npmPath, '#!/bin/sh\nnode "$(dirname "$0")/../npm/bin/npm-cli.js" "$@"\n', 'utf8');
    fs.chmodSync(npmPath, 0o755);
  }
}

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-install-failures-'));
  try {
    const installer = new EnvironmentInstaller();
    const cases = [
      ['synthetic-network-failure', 'network'],
      ['synthetic-permission-failure', 'permission'],
      ['synthetic-peer-conflict', 'peer_conflict'],
    ];
    for (const [pkg, reason] of cases) {
      const envPath = path.join(root, pkg);
      fs.mkdirSync(envPath, { recursive: true });
      createFakeNodeEnvironment(envPath);
      const result = await installer.installPackages({ environmentPath: envPath, environmentType: 'node', packages: [pkg] });
      assert.equal(result.success, false);
      assert.equal(result.details.failureReasons[pkg], reason);
      assert.equal(result.details.beforeSnapshotAvailable, true);
      assert.equal(result.details.afterSnapshotAvailable, true);
      assert.equal(result.details.consistencyVerified, false);
    }

    const partialPath = path.join(root, 'partial');
    fs.mkdirSync(partialPath, { recursive: true });
    createFakeNodeEnvironment(partialPath);
    const partial = await installer.installPackages({
      environmentPath: partialPath,
      environmentType: 'node',
      packages: ['good-package@1.0.0', 'synthetic-network-failure'],
    });
    assert.equal(partial.success, false);
    assert.deepEqual(partial.installed, ['good-package@1.0.0']);
    assert.deepEqual(partial.failed, ['synthetic-network-failure']);
    assert.deepEqual(partial.details.rollbackCandidatePackages, ['good-package']);
    assert.equal(partial.details.consistencyVerified, false);

    console.log('Install failure and snapshot regression cases passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
